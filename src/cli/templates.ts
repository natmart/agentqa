/**
 * AgentQA Config Templates
 * Pre-configured templates for common project setups
 */

export interface ConfigTemplate {
  name: string;
  description: string;
  projectType: 'typescript' | 'javascript' | 'python';
  framework: string;
  config: string;
}

/**
 * TypeScript + Vitest template
 */
export const typescriptVitestTemplate: ConfigTemplate = {
  name: 'typescript-vitest',
  description: 'TypeScript project with Vitest testing framework',
  projectType: 'typescript',
  framework: 'vitest',
  config: `# AgentQA Configuration - TypeScript + Vitest
# Optimized for modern TypeScript projects

project:
  name: my-typescript-project
  type: typescript

generation:
  framework: vitest
  model: gpt-4o-mini
  testDirectory: __tests__
  sourceDirectory: src
  
  # TypeScript-specific options
  typescript:
    strict: true
    importStyle: esm  # esm | commonjs
    useTypeImports: true

healing:
  enabled: true
  maxRetries: 3
  model: gpt-4o

review:
  enabled: true
  minScore: 70
  categories:
    - assertions
    - structure
    - coverage
    - maintainability
    - bestPractices
    - typeChecking

runner:
  command: npx vitest run
  timeout: 30000
  coverage: true
  coverageThreshold:
    lines: 80
    branches: 70
    functions: 80

exclude:
  - node_modules
  - dist
  - build
  - coverage
  - "*.d.ts"
  - "*.config.ts"
  - "*.config.js"

# Vitest-specific settings
vitest:
  globals: true
  environment: node  # node | jsdom | happy-dom
  setupFiles:
    - ./test/setup.ts
`,
};

/**
 * TypeScript + Jest template
 */
export const typescriptJestTemplate: ConfigTemplate = {
  name: 'typescript-jest',
  description: 'TypeScript project with Jest testing framework',
  projectType: 'typescript',
  framework: 'jest',
  config: `# AgentQA Configuration - TypeScript + Jest
# Classic setup for TypeScript projects

project:
  name: my-typescript-project
  type: typescript

generation:
  framework: jest
  model: gpt-4o-mini
  testDirectory: __tests__
  sourceDirectory: src
  
  typescript:
    strict: true
    importStyle: commonjs  # Jest typically uses CommonJS
    useTypeImports: false

healing:
  enabled: true
  maxRetries: 3
  model: gpt-4o

review:
  enabled: true
  minScore: 70
  categories:
    - assertions
    - structure
    - coverage
    - maintainability
    - bestPractices

runner:
  command: npx jest
  timeout: 30000
  coverage: true
  coverageThreshold:
    lines: 80
    branches: 70
    functions: 80

exclude:
  - node_modules
  - dist
  - build
  - coverage
  - "*.d.ts"
  - "jest.config.*"

# Jest-specific settings
jest:
  preset: ts-jest
  testEnvironment: node
  moduleNameMapper:
    "^@/(.*)$": "<rootDir>/src/$1"
  collectCoverageFrom:
    - "src/**/*.{ts,tsx}"
    - "!src/**/*.d.ts"
`,
};

/**
 * JavaScript + Jest template
 */
export const javascriptJestTemplate: ConfigTemplate = {
  name: 'javascript-jest',
  description: 'JavaScript project with Jest testing framework',
  projectType: 'javascript',
  framework: 'jest',
  config: `# AgentQA Configuration - JavaScript + Jest
# Standard setup for JavaScript projects

project:
  name: my-javascript-project
  type: javascript

generation:
  framework: jest
  model: gpt-4o-mini
  testDirectory: __tests__
  sourceDirectory: src

healing:
  enabled: true
  maxRetries: 3
  model: gpt-4o

review:
  enabled: true
  minScore: 70
  categories:
    - assertions
    - structure
    - coverage
    - maintainability
    - bestPractices

runner:
  command: npx jest
  timeout: 30000
  coverage: true
  coverageThreshold:
    lines: 75
    branches: 65
    functions: 75

exclude:
  - node_modules
  - dist
  - build
  - coverage
  - "*.min.js"
  - "jest.config.js"

# Jest-specific settings
jest:
  testEnvironment: node
  collectCoverageFrom:
    - "src/**/*.js"
    - "!src/**/*.test.js"
`,
};

/**
 * Python + pytest template
 */
export const pythonPytestTemplate: ConfigTemplate = {
  name: 'python-pytest',
  description: 'Python project with pytest testing framework',
  projectType: 'python',
  framework: 'pytest',
  config: `# AgentQA Configuration - Python + pytest
# Standard setup for Python projects

project:
  name: my-python-project
  type: python

generation:
  framework: pytest
  model: gpt-4o-mini
  testDirectory: tests
  sourceDirectory: src

healing:
  enabled: true
  maxRetries: 3
  model: gpt-4o

review:
  enabled: true
  minScore: 70
  categories:
    - assertions
    - structure
    - coverage
    - maintainability
    - bestPractices

runner:
  command: python -m pytest
  timeout: 60000
  coverage: true
  coverageThreshold:
    lines: 80
    branches: 70
    functions: 80

exclude:
  - __pycache__
  - .venv
  - venv
  - .pytest_cache
  - "*.pyc"
  - setup.py
  - conftest.py

# pytest-specific settings
pytest:
  addopts: "-v --cov --cov-report=term-missing"
  testpaths:
    - tests
  pythonFiles:
    - "test_*.py"
    - "*_test.py"
  markers:
    - slow: marks tests as slow
    - integration: marks tests as integration tests
`,
};

/**
 * All available templates
 */
export const templates: ConfigTemplate[] = [
  typescriptVitestTemplate,
  typescriptJestTemplate,
  javascriptJestTemplate,
  pythonPytestTemplate,
];

/**
 * Get template by name
 */
export function getTemplate(name: string): ConfigTemplate | undefined {
  return templates.find(t => t.name === name);
}

/**
 * Get template by project type and framework
 */
export function getTemplateByTypeAndFramework(
  projectType: string,
  framework: string
): ConfigTemplate | undefined {
  return templates.find(
    t => t.projectType === projectType && t.framework === framework
  );
}

/**
 * List all templates
 */
export function listTemplates(): { name: string; description: string }[] {
  return templates.map(t => ({
    name: t.name,
    description: t.description,
  }));
}
