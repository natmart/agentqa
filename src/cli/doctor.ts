/**
 * AgentQA Doctor - Diagnose setup issues
 */
import pc from 'picocolors';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync, spawn } from 'child_process';
import { detectProject } from './init.js';

export interface DiagnosticResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
}

export interface DoctorReport {
  results: DiagnosticResult[];
  passed: number;
  warnings: number;
  failed: number;
  healthy: boolean;
}

/**
 * Check Node.js version
 */
function checkNodeVersion(): DiagnosticResult {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);
    
    if (major >= 18) {
      return {
        name: 'Node.js Version',
        status: 'pass',
        message: `Node.js ${version} is installed`,
      };
    } else if (major >= 16) {
      return {
        name: 'Node.js Version',
        status: 'warn',
        message: `Node.js ${version} - upgrade recommended`,
        suggestion: 'AgentQA works best with Node.js 18+. Consider upgrading.',
      };
    } else {
      return {
        name: 'Node.js Version',
        status: 'fail',
        message: `Node.js ${version} is too old`,
        suggestion: 'Please upgrade to Node.js 18 or higher.',
      };
    }
  } catch (e) {
    return {
      name: 'Node.js Version',
      status: 'fail',
      message: 'Could not determine Node.js version',
      suggestion: 'Ensure Node.js is properly installed.',
    };
  }
}

/**
 * Check for config file
 */
function checkConfig(cwd: string): DiagnosticResult {
  const configPath = join(cwd, '.agentqa.yml');
  
  if (!existsSync(configPath)) {
    return {
      name: 'Configuration',
      status: 'fail',
      message: '.agentqa.yml not found',
      suggestion: 'Run "agentqa init" to create a configuration file.',
    };
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    
    // Basic validation
    if (!content.includes('project:') || !content.includes('generation:')) {
      return {
        name: 'Configuration',
        status: 'warn',
        message: '.agentqa.yml exists but may be incomplete',
        suggestion: 'Run "agentqa init --force" to regenerate configuration.',
      };
    }
    
    return {
      name: 'Configuration',
      status: 'pass',
      message: '.agentqa.yml is valid',
    };
  } catch (e) {
    return {
      name: 'Configuration',
      status: 'fail',
      message: 'Could not read .agentqa.yml',
      suggestion: 'Check file permissions and YAML syntax.',
    };
  }
}

/**
 * Check API key
 */
function checkApiKey(): DiagnosticResult {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      name: 'OpenAI API Key',
      status: 'warn',
      message: 'OPENAI_API_KEY environment variable not set',
      suggestion: 'Set OPENAI_API_KEY env var or provide --api-key flag when generating tests.',
    };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return {
      name: 'OpenAI API Key',
      status: 'warn',
      message: 'API key format looks unusual',
      suggestion: 'Verify your OpenAI API key is correct.',
    };
  }
  
  return {
    name: 'OpenAI API Key',
    status: 'pass',
    message: 'API key is configured',
  };
}

/**
 * Check test runner
 */
async function checkTestRunner(cwd: string): Promise<DiagnosticResult> {
  const projectInfo = detectProject(cwd);
  
  if (projectInfo.testFramework === 'none') {
    return {
      name: 'Test Runner',
      status: 'warn',
      message: 'No test framework detected',
      suggestion: 'Install a test framework: npm install -D vitest',
    };
  }
  
  // Try to run the test framework
  let command: string;
  let args: string[];
  
  switch (projectInfo.testFramework) {
    case 'vitest':
      command = 'npx';
      args = ['vitest', '--version'];
      break;
    case 'jest':
      command = 'npx';
      args = ['jest', '--version'];
      break;
    case 'mocha':
      command = 'npx';
      args = ['mocha', '--version'];
      break;
    case 'pytest':
      command = 'python';
      args = ['-m', 'pytest', '--version'];
      break;
    default:
      return {
        name: 'Test Runner',
        status: 'warn',
        message: 'Unknown test framework',
        suggestion: 'Manually verify your test runner works.',
      };
  }
  
  return new Promise((resolve) => {
    try {
      const proc = spawn(command, args, { 
        cwd, 
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10000,
      });
      
      let output = '';
      proc.stdout?.on('data', (data) => { output += data.toString(); });
      proc.stderr?.on('data', (data) => { output += data.toString(); });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({
            name: 'Test Runner',
            status: 'pass',
            message: `${projectInfo.testFramework} is working`,
          });
        } else {
          resolve({
            name: 'Test Runner',
            status: 'fail',
            message: `${projectInfo.testFramework} failed to run`,
            suggestion: `Run "${command} ${args.join(' ')}" manually to debug.`,
          });
        }
      });
      
      proc.on('error', () => {
        resolve({
          name: 'Test Runner',
          status: 'fail',
          message: `Could not run ${projectInfo.testFramework}`,
          suggestion: `Install the test runner: npm install -D ${projectInfo.testFramework}`,
        });
      });
    } catch (e) {
      resolve({
        name: 'Test Runner',
        status: 'fail',
        message: 'Test runner check failed',
        suggestion: 'Ensure your test framework is properly installed.',
      });
    }
  });
}

/**
 * Check package.json scripts
 */
function checkPackageScripts(cwd: string): DiagnosticResult {
  const packageJsonPath = join(cwd, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    return {
      name: 'Package Scripts',
      status: 'warn',
      message: 'No package.json found',
      suggestion: 'Run "npm init" to create a package.json.',
    };
  }
  
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const scripts = pkg.scripts || {};
    
    if (!scripts.test) {
      return {
        name: 'Package Scripts',
        status: 'warn',
        message: 'No "test" script defined in package.json',
        suggestion: 'Add a test script: "test": "vitest run"',
      };
    }
    
    return {
      name: 'Package Scripts',
      status: 'pass',
      message: 'Test script is configured',
    };
  } catch (e) {
    return {
      name: 'Package Scripts',
      status: 'fail',
      message: 'Could not parse package.json',
      suggestion: 'Check package.json for syntax errors.',
    };
  }
}

/**
 * Check Git status
 */
function checkGitRepo(cwd: string): DiagnosticResult {
  if (!existsSync(join(cwd, '.git'))) {
    return {
      name: 'Git Repository',
      status: 'warn',
      message: 'Not a Git repository',
      suggestion: 'Run "git init" to initialize version control.',
    };
  }
  
  try {
    // Check if .agentqa.yml is in .gitignore
    const gitignorePath = join(cwd, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      if (gitignore.includes('.agentqa.yml')) {
        return {
          name: 'Git Repository',
          status: 'warn',
          message: '.agentqa.yml is in .gitignore',
          suggestion: 'Consider committing .agentqa.yml for team consistency.',
        };
      }
    }
    
    return {
      name: 'Git Repository',
      status: 'pass',
      message: 'Git repository detected',
    };
  } catch (e) {
    return {
      name: 'Git Repository',
      status: 'pass',
      message: 'Git repository detected',
    };
  }
}

/**
 * Check for TypeScript config
 */
function checkTypeScript(cwd: string): DiagnosticResult {
  const projectInfo = detectProject(cwd);
  
  if (projectInfo.type !== 'typescript') {
    return {
      name: 'TypeScript',
      status: 'pass',
      message: 'Not a TypeScript project (skipped)',
    };
  }
  
  if (!existsSync(join(cwd, 'tsconfig.json'))) {
    return {
      name: 'TypeScript',
      status: 'fail',
      message: 'tsconfig.json not found',
      suggestion: 'Run "npx tsc --init" to create a TypeScript configuration.',
    };
  }
  
  return {
    name: 'TypeScript',
    status: 'pass',
    message: 'TypeScript is configured',
  };
}

/**
 * Run all diagnostics
 */
export async function runDoctor(cwd: string = process.cwd()): Promise<DoctorReport> {
  const results: DiagnosticResult[] = [];
  
  // Sync checks
  results.push(checkNodeVersion());
  results.push(checkConfig(cwd));
  results.push(checkApiKey());
  results.push(checkPackageScripts(cwd));
  results.push(checkGitRepo(cwd));
  results.push(checkTypeScript(cwd));
  
  // Async checks
  results.push(await checkTestRunner(cwd));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  return {
    results,
    passed,
    warnings,
    failed,
    healthy: failed === 0,
  };
}

/**
 * Format doctor report for CLI output
 */
export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = [];
  
  lines.push(pc.bold(pc.cyan('\n🩺 AgentQA Doctor\n')));
  lines.push(pc.gray('Running diagnostics...\n'));
  
  for (const result of report.results) {
    const icon = result.status === 'pass' ? pc.green('✓')
      : result.status === 'warn' ? pc.yellow('⚠')
      : pc.red('✗');
    
    const statusColor = result.status === 'pass' ? pc.green
      : result.status === 'warn' ? pc.yellow
      : pc.red;
    
    lines.push(`  ${icon} ${pc.bold(result.name)}`);
    lines.push(`    ${statusColor(result.message)}`);
    
    if (result.suggestion) {
      lines.push(`    ${pc.gray('→ ' + result.suggestion)}`);
    }
    lines.push('');
  }
  
  // Summary
  lines.push(pc.bold('Summary:'));
  lines.push(`  ${pc.green(`✓ ${report.passed} passed`)}`);
  if (report.warnings > 0) {
    lines.push(`  ${pc.yellow(`⚠ ${report.warnings} warnings`)}`);
  }
  if (report.failed > 0) {
    lines.push(`  ${pc.red(`✗ ${report.failed} failed`)}`);
  }
  lines.push('');
  
  if (report.healthy) {
    lines.push(pc.bold(pc.green('🎉 Your setup looks healthy!\n')));
  } else {
    lines.push(pc.bold(pc.red('❌ Some issues need attention.\n')));
    lines.push(pc.gray('Fix the failed checks and run "agentqa doctor" again.\n'));
  }
  
  return lines.join('\n');
}
