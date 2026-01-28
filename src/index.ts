// AgentQA - AI-powered automated QA testing orchestration
export { scanCodebase, generateTestSuggestions } from './core/scanner.js';
export type { ScannedFile, ScanResult } from './core/scanner.js';

export { generateTests, generateTestsForFiles } from './core/generator.js';
export type { GeneratedTest, GeneratorOptions, TestFramework } from './core/generator.js';

export { runTests, formatTestResult } from './core/runner.js';
export type { TestResult, CoverageResult, RunOptions } from './core/runner.js';

export { api } from './api/routes.js';
