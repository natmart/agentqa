/**
 * AgentQA Interactive Setup Wizard
 * Detects project type, test framework, and creates configuration
 */
import pc from 'picocolors';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import * as readline from 'readline';

export interface ProjectInfo {
  type: 'typescript' | 'javascript' | 'python' | 'unknown';
  testFramework: 'vitest' | 'jest' | 'mocha' | 'pytest' | 'none';
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasSetupPy: boolean;
  hasPyproject: boolean;
  hasRequirements: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'unknown';
  projectName: string;
}

export interface InitOptions {
  cwd?: string;
  force?: boolean;
  skipCicd?: boolean;
}

// Prompt helper
function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function confirm(rl: readline.Interface, question: string, defaultYes = true): Promise<boolean> {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await ask(rl, `${question} ${suffix} `);
  if (answer === '') return defaultYes;
  return answer.toLowerCase().startsWith('y');
}

async function select<T extends string>(
  rl: readline.Interface,
  question: string,
  options: { value: T; label: string }[],
  defaultValue?: T
): Promise<T> {
  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    const marker = opt.value === defaultValue ? pc.cyan('→') : ' ';
    console.log(`  ${marker} ${i + 1}. ${opt.label}`);
  });
  
  const answer = await ask(rl, `\nSelect (1-${options.length}): `);
  const index = parseInt(answer, 10) - 1;
  
  if (isNaN(index) || index < 0 || index >= options.length) {
    return defaultValue || options[0].value;
  }
  return options[index].value;
}

/**
 * Detect project information from the file system
 */
export function detectProject(cwd: string): ProjectInfo {
  const info: ProjectInfo = {
    type: 'unknown',
    testFramework: 'none',
    hasPackageJson: false,
    hasTsConfig: false,
    hasSetupPy: false,
    hasPyproject: false,
    hasRequirements: false,
    packageManager: 'unknown',
    projectName: basename(cwd),
  };

  // Check for Node.js project files
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    info.hasPackageJson = true;
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      info.projectName = pkg.name || info.projectName;
      
      // Detect type from package.json
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      // Check for TypeScript
      if (allDeps['typescript'] || existsSync(join(cwd, 'tsconfig.json'))) {
        info.type = 'typescript';
        info.hasTsConfig = true;
      } else {
        info.type = 'javascript';
      }
      
      // Detect test framework
      if (allDeps['vitest']) {
        info.testFramework = 'vitest';
      } else if (allDeps['jest']) {
        info.testFramework = 'jest';
      } else if (allDeps['mocha']) {
        info.testFramework = 'mocha';
      }
      
      // Detect package manager
      if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
        info.packageManager = 'pnpm';
      } else if (existsSync(join(cwd, 'yarn.lock'))) {
        info.packageManager = 'yarn';
      } else if (existsSync(join(cwd, 'package-lock.json'))) {
        info.packageManager = 'npm';
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check for TypeScript config without package.json check
  if (existsSync(join(cwd, 'tsconfig.json'))) {
    info.hasTsConfig = true;
    if (info.type === 'unknown') {
      info.type = 'typescript';
    }
  }

  // Check for Python project files
  if (existsSync(join(cwd, 'setup.py'))) {
    info.hasSetupPy = true;
    info.type = 'python';
    info.packageManager = 'pip';
  }
  
  if (existsSync(join(cwd, 'pyproject.toml'))) {
    info.hasPyproject = true;
    info.type = 'python';
    info.packageManager = 'pip';
    
    // Check for pytest in pyproject.toml
    try {
      const content = readFileSync(join(cwd, 'pyproject.toml'), 'utf-8');
      if (content.includes('pytest')) {
        info.testFramework = 'pytest';
      }
    } catch (e) {}
  }
  
  if (existsSync(join(cwd, 'requirements.txt'))) {
    info.hasRequirements = true;
    if (info.type === 'unknown') {
      info.type = 'python';
      info.packageManager = 'pip';
    }
    
    // Check for pytest in requirements.txt
    try {
      const content = readFileSync(join(cwd, 'requirements.txt'), 'utf-8');
      if (content.includes('pytest')) {
        info.testFramework = 'pytest';
      }
    } catch (e) {}
  }

  return info;
}

/**
 * Generate .agentqa.yml config content
 */
export function generateConfig(
  projectInfo: ProjectInfo,
  options: {
    framework: string;
    testDir: string;
    sourceDir: string;
    apiKey?: string;
    model?: string;
  }
): string {
  const config = `# AgentQA Configuration
# Generated by 'agentqa init'

# Project settings
project:
  name: ${projectInfo.projectName}
  type: ${projectInfo.type}

# Test generation settings
generation:
  framework: ${options.framework}
  model: ${options.model || 'gpt-4o-mini'}
  testDirectory: ${options.testDir}
  sourceDirectory: ${options.sourceDir}

# Self-healing settings
healing:
  enabled: true
  maxRetries: 3
  model: gpt-4o

# Quality review settings
review:
  enabled: true
  minScore: 70
  categories:
    - assertions
    - structure
    - coverage
    - maintainability
    - bestPractices

# Runner settings
runner:
  timeout: 30000
  coverage: true
  parallel: true

# Paths to exclude from scanning
exclude:
  - node_modules
  - dist
  - build
  - coverage
  - __pycache__
  - .git
  - "*.min.js"
  - "*.d.ts"

# API settings (can also use OPENAI_API_KEY env var)
# api:
#   key: ${options.apiKey || '${OPENAI_API_KEY}'}
`;

  return config;
}

/**
 * Generate GitHub Actions workflow
 */
export function generateCIWorkflow(projectInfo: ProjectInfo, framework: string): string {
  const isNode = projectInfo.type === 'typescript' || projectInfo.type === 'javascript';
  const isPython = projectInfo.type === 'python';
  
  let workflow = `# AgentQA CI/CD Workflow
# Generated by 'agentqa init'

name: AgentQA Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
`;

  if (isNode) {
    workflow += `
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: '${projectInfo.packageManager === 'unknown' ? 'npm' : projectInfo.packageManager}'
      
      - name: Install dependencies
        run: ${projectInfo.packageManager === 'yarn' ? 'yarn install' : projectInfo.packageManager === 'pnpm' ? 'pnpm install' : 'npm ci'}
      
      - name: Run tests
        run: ${projectInfo.packageManager === 'yarn' ? 'yarn test' : projectInfo.packageManager === 'pnpm' ? 'pnpm test' : 'npm test'}
      
      - name: AgentQA Review
        if: always()
        run: npx agentqa review --min-severity warning
`;
  } else if (isPython) {
    workflow += `
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python \${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install pytest pytest-cov
          ${projectInfo.hasRequirements ? 'pip install -r requirements.txt' : ''}
          ${projectInfo.hasPyproject ? 'pip install -e .' : ''}
      
      - name: Run tests with coverage
        run: pytest --cov --cov-report=xml
      
      - name: AgentQA Review
        if: always()
        run: npx agentqa review --min-severity warning
`;
  }

  workflow += `
  # Optional: Generate tests for new code
  # generate:
  #   runs-on: ubuntu-latest
  #   if: github.event_name == 'pull_request'
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Setup Node.js
  #       uses: actions/setup-node@v4
  #       with:
  #         node-version: 20.x
  #     - name: Generate missing tests
  #       run: npx agentqa generate --dry-run
  #       env:
  #         OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
`;

  return workflow;
}

/**
 * Run the interactive init wizard
 */
export async function runInitWizard(options: InitOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const configPath = join(cwd, '.agentqa.yml');
  
  console.log(pc.bold(pc.cyan('\n🚀 AgentQA Setup Wizard\n')));
  console.log(pc.gray('This wizard will help you configure AgentQA for your project.\n'));
  
  // Check for existing config
  if (existsSync(configPath) && !options.force) {
    console.log(pc.yellow('⚠️  A .agentqa.yml file already exists.'));
    console.log(pc.gray('   Use --force to overwrite.\n'));
    return;
  }
  
  // Detect project
  console.log(pc.cyan('🔍 Detecting project configuration...'));
  const projectInfo = detectProject(cwd);
  
  console.log('');
  console.log(pc.bold('Detected:'));
  console.log(`   Project name: ${pc.green(projectInfo.projectName)}`);
  console.log(`   Project type: ${pc.green(projectInfo.type)}`);
  console.log(`   Test framework: ${pc.green(projectInfo.testFramework === 'none' ? 'Not detected' : projectInfo.testFramework)}`);
  console.log(`   Package manager: ${pc.green(projectInfo.packageManager)}`);
  console.log('');
  
  const rl = createPrompt();
  
  try {
    // Confirm or select project type
    const confirmedType = await confirm(rl, `Is this a ${pc.bold(projectInfo.type)} project?`);
    let finalType = projectInfo.type;
    
    if (!confirmedType) {
      finalType = await select(rl, 'Select your project type:', [
        { value: 'typescript', label: 'TypeScript' },
        { value: 'javascript', label: 'JavaScript' },
        { value: 'python', label: 'Python' },
      ]);
    }
    
    // Select test framework
    let frameworkOptions: { value: string; label: string }[];
    
    if (finalType === 'python') {
      frameworkOptions = [
        { value: 'pytest', label: 'pytest (recommended)' },
      ];
    } else {
      frameworkOptions = [
        { value: 'vitest', label: 'Vitest (recommended for modern projects)' },
        { value: 'jest', label: 'Jest (widely supported)' },
        { value: 'mocha', label: 'Mocha (flexible)' },
      ];
    }
    
    const defaultFramework = projectInfo.testFramework !== 'none' 
      ? projectInfo.testFramework 
      : (finalType === 'python' ? 'pytest' : 'vitest');
    
    const framework = await select(
      rl,
      'Select your test framework:',
      frameworkOptions,
      defaultFramework
    );
    
    // Configure directories
    const defaultTestDir = finalType === 'python' ? 'tests' : '__tests__';
    const defaultSourceDir = finalType === 'python' ? 'src' : 'src';
    
    console.log('');
    const testDir = await ask(rl, `Test directory (${pc.gray(defaultTestDir)}): `) || defaultTestDir;
    const sourceDir = await ask(rl, `Source directory (${pc.gray(defaultSourceDir)}): `) || defaultSourceDir;
    
    // Optional API key
    console.log('');
    console.log(pc.gray('API key is needed for test generation. You can also set OPENAI_API_KEY env var.'));
    const apiKey = await ask(rl, 'OpenAI API key (optional, press Enter to skip): ');
    
    // Generate config
    console.log('');
    console.log(pc.cyan('📝 Generating configuration...'));
    
    const configContent = generateConfig(
      { ...projectInfo, type: finalType as any },
      { framework, testDir, sourceDir, apiKey: apiKey || undefined }
    );
    
    writeFileSync(configPath, configContent);
    console.log(pc.green(`   ✅ Created .agentqa.yml`));
    
    // Offer CI/CD setup
    if (!options.skipCicd) {
      console.log('');
      const addCicd = await confirm(rl, 'Would you like to add GitHub Actions CI/CD?');
      
      if (addCicd) {
        const workflowDir = join(cwd, '.github', 'workflows');
        const workflowPath = join(workflowDir, 'agentqa.yml');
        
        mkdirSync(workflowDir, { recursive: true });
        const workflowContent = generateCIWorkflow({ ...projectInfo, type: finalType as any }, framework);
        writeFileSync(workflowPath, workflowContent);
        console.log(pc.green(`   ✅ Created .github/workflows/agentqa.yml`));
      }
    }
    
    // Show next steps
    console.log('');
    console.log(pc.bold(pc.green('🎉 Setup complete!\n')));
    console.log(pc.bold('Next steps:'));
    console.log(`   1. ${pc.cyan('agentqa scan')} - Find files that need tests`);
    console.log(`   2. ${pc.cyan('agentqa generate')} - Generate tests automatically`);
    console.log(`   3. ${pc.cyan('agentqa heal')} - Generate self-healing tests`);
    console.log(`   4. ${pc.cyan('agentqa review')} - Review test quality`);
    console.log('');
    console.log(pc.gray('Run "agentqa doctor" to verify your setup.'));
    console.log('');
    
  } finally {
    rl.close();
  }
}
