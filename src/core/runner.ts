import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface TestResult {
  framework: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  coverage?: CoverageResult;
  output: string;
  success: boolean;
}

export interface CoverageResult {
  lines: number;
  statements: number;
  branches: number;
  functions: number;
}

export interface RunOptions {
  cwd: string;
  coverage?: boolean;
  watch?: boolean;
  filter?: string;
  timeout?: number;
}

function detectFramework(cwd: string): 'vitest' | 'jest' | 'pytest' | null {
  const packageJsonPath = join(cwd, 'package.json');
  const pytestPath = join(cwd, 'pytest.ini');
  const pyprojectPath = join(cwd, 'pyproject.toml');
  
  // Check for Python test frameworks
  if (existsSync(pytestPath) || existsSync(pyprojectPath)) {
    return 'pytest';
  }
  
  // Check package.json for JS frameworks
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = require(packageJsonPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps['vitest']) return 'vitest';
      if (deps['jest']) return 'jest';
    } catch {
      // Fall through
    }
  }
  
  // Check for config files
  if (existsSync(join(cwd, 'vitest.config.ts')) || existsSync(join(cwd, 'vitest.config.js'))) {
    return 'vitest';
  }
  if (existsSync(join(cwd, 'jest.config.ts')) || existsSync(join(cwd, 'jest.config.js'))) {
    return 'jest';
  }
  
  return null;
}

function runCommand(command: string, args: string[], options: RunOptions): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    const timeout = options.timeout || 300000; // 5 min default
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({ stdout, stderr: stderr + '\nTest run timed out', code: 1 });
    }, timeout);
    
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code || 0 });
    });
    
    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, code: 1 });
    });
  });
}

function stripAnsi(str: string): string {
  // Remove ANSI escape codes for accurate parsing
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function parseVitestOutput(output: string): Partial<TestResult> {
  const result: Partial<TestResult> = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  
  // Strip ANSI codes for accurate parsing
  const clean = stripAnsi(output);
  
  // Parse test counts - new vitest format: "Tests  13 passed (13)"
  // Simpler approach: find passed, failed, skipped counts separately
  const passedMatch = clean.match(/Tests\s+(\d+)\s*passed/i);
  const failedMatch = clean.match(/(\d+)\s*failed/i);
  const skippedMatch = clean.match(/(\d+)\s*skipped/i);
  const totalMatch = clean.match(/Tests.*\((\d+)\)/i);
  
  if (passedMatch) result.passed = parseInt(passedMatch[1], 10);
  if (failedMatch) result.failed = parseInt(failedMatch[1], 10);
  if (skippedMatch) result.skipped = parseInt(skippedMatch[1], 10);
  if (totalMatch) {
    result.total = parseInt(totalMatch[1], 10);
  } else {
    result.total = (result.passed ?? 0) + (result.failed ?? 0) + (result.skipped ?? 0);
  }
  
  // Parse duration
  const durationMatch = output.match(/Duration:\s*([\d.]+)\s*(s|ms)/i);
  if (durationMatch) {
    const value = parseFloat(durationMatch[1]);
    result.duration = durationMatch[2] === 's' ? value * 1000 : value;
  }
  
  // Parse coverage
  const coverageMatch = output.match(/All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
  if (coverageMatch) {
    result.coverage = {
      statements: parseFloat(coverageMatch[1]),
      branches: parseFloat(coverageMatch[2]),
      functions: parseFloat(coverageMatch[3]),
      lines: parseFloat(coverageMatch[4]),
    };
  }
  
  return result;
}

function parseJestOutput(output: string): Partial<TestResult> {
  const result: Partial<TestResult> = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  
  // Parse test counts
  const testMatch = output.match(/Tests:\s*(?:(\d+)\s*passed,?\s*)?(?:(\d+)\s*failed,?\s*)?(?:(\d+)\s*skipped,?\s*)?(\d+)\s*total/i);
  if (testMatch) {
    result.passed = parseInt(testMatch[1] || '0', 10);
    result.failed = parseInt(testMatch[2] || '0', 10);
    result.skipped = parseInt(testMatch[3] || '0', 10);
    result.total = parseInt(testMatch[4] || '0', 10);
  }
  
  // Parse duration
  const durationMatch = output.match(/Time:\s*([\d.]+)\s*(s|ms)/i);
  if (durationMatch) {
    const value = parseFloat(durationMatch[1]);
    result.duration = durationMatch[2] === 's' ? value * 1000 : value;
  }
  
  return result;
}

function parsePytestOutput(output: string): Partial<TestResult> {
  const result: Partial<TestResult> = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  
  // Parse test counts: "5 passed, 2 failed, 1 skipped"
  const passedMatch = output.match(/(\d+)\s*passed/i);
  const failedMatch = output.match(/(\d+)\s*failed/i);
  const skippedMatch = output.match(/(\d+)\s*skipped/i);
  
  result.passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
  result.failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
  result.skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
  result.total = result.passed + result.failed + result.skipped;
  
  // Parse duration
  const durationMatch = output.match(/in\s*([\d.]+)\s*s/i);
  if (durationMatch) {
    result.duration = parseFloat(durationMatch[1]) * 1000;
  }
  
  // Parse coverage if present
  const coverageMatch = output.match(/TOTAL\s+\d+\s+\d+\s+(\d+)%/);
  if (coverageMatch) {
    const pct = parseFloat(coverageMatch[1]);
    result.coverage = {
      lines: pct,
      statements: pct,
      branches: pct,
      functions: pct,
    };
  }
  
  return result;
}

export async function runTests(options: RunOptions): Promise<TestResult> {
  const framework = detectFramework(options.cwd);
  
  if (!framework) {
    return {
      framework: 'unknown',
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      output: 'No test framework detected. Please install vitest, jest, or pytest.',
      success: false,
    };
  }
  
  let command: string;
  let args: string[] = [];
  
  switch (framework) {
    case 'vitest':
      command = 'npx';
      args = ['vitest', 'run'];
      if (options.coverage) args.push('--coverage');
      if (options.filter) args.push(options.filter);
      break;
      
    case 'jest':
      command = 'npx';
      args = ['jest'];
      if (options.coverage) args.push('--coverage');
      if (options.filter) args.push(options.filter);
      break;
      
    case 'pytest':
      command = 'pytest';
      args = ['-v'];
      if (options.coverage) args.push('--cov', '--cov-report=term');
      if (options.filter) args.push('-k', options.filter);
      break;
  }
  
  const startTime = Date.now();
  const { stdout, stderr, code } = await runCommand(command, args, options);
  const duration = Date.now() - startTime;
  
  const output = stdout + '\n' + stderr;
  
  let parsed: Partial<TestResult>;
  switch (framework) {
    case 'vitest':
      parsed = parseVitestOutput(output);
      break;
    case 'jest':
      parsed = parseJestOutput(output);
      break;
    case 'pytest':
      parsed = parsePytestOutput(output);
      break;
    default:
      parsed = {};
  }
  
  return {
    framework,
    passed: parsed.passed || 0,
    failed: parsed.failed || 0,
    skipped: parsed.skipped || 0,
    total: parsed.total || 0,
    duration: parsed.duration || duration,
    coverage: parsed.coverage,
    output,
    success: code === 0,
  };
}

export function formatTestResult(result: TestResult): string {
  const lines: string[] = [
    `\n📊 Test Results (${result.framework})`,
    '─'.repeat(40),
  ];
  
  const statusIcon = result.success ? '✅' : '❌';
  lines.push(`${statusIcon} Status: ${result.success ? 'PASSED' : 'FAILED'}`);
  lines.push(`   Passed:  ${result.passed}`);
  lines.push(`   Failed:  ${result.failed}`);
  lines.push(`   Skipped: ${result.skipped}`);
  lines.push(`   Total:   ${result.total}`);
  lines.push(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
  
  if (result.coverage) {
    lines.push('');
    lines.push('📈 Coverage:');
    lines.push(`   Lines:      ${result.coverage.lines.toFixed(1)}%`);
    lines.push(`   Statements: ${result.coverage.statements.toFixed(1)}%`);
    lines.push(`   Branches:   ${result.coverage.branches.toFixed(1)}%`);
    lines.push(`   Functions:  ${result.coverage.functions.toFixed(1)}%`);
  }
  
  return lines.join('\n');
}
