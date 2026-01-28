// AgentQA - AI-powered automated QA testing orchestration
export { scanCodebase, generateTestSuggestions } from './core/scanner.js';
export type { ScannedFile, ScanResult } from './core/scanner.js';

export { generateTests, generateTestsForFiles } from './core/generator.js';
export type { GeneratedTest, GeneratorOptions, TestFramework } from './core/generator.js';

export { runTests, formatTestResult } from './core/runner.js';
export type { TestResult, CoverageResult, RunOptions } from './core/runner.js';

// API Test Coverage
export { scanApiRoutes, formatRoutes, groupRoutesByPath } from './core/api-scanner.js';
export type { ApiRoute, ApiScanResult, OpenApiSpec, HttpMethod, RouteParameter } from './core/api-scanner.js';

export { generateApiTests, generateFromOpenApi, validateResponse } from './core/api-tester.js';
export type { GeneratedApiTest, ApiTestGeneratorOptions } from './core/api-tester.js';

export { api } from './api/routes.js';
