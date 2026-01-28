/**
 * API Tester - Generates API contract tests
 * 
 * Features:
 * - Parses OpenAPI/Swagger specs for test generation
 * - Infers endpoints from Express/Hono/Next.js/Fastify routes
 * - Generates request/response validation tests
 * - Tests status codes, headers, body schemas
 */

import OpenAI from 'openai';
import type { ApiRoute, ApiScanResult, OpenApiSpec, HttpMethod, RouteParameter } from './api-scanner.js';

export type TestFramework = 'jest' | 'vitest' | 'pytest';
export type HttpClient = 'fetch' | 'supertest' | 'axios' | 'httpx';

export interface GeneratedApiTest {
  framework: TestFramework;
  httpClient: HttpClient;
  filename: string;
  content: string;
  routes: ApiRoute[];
  description?: string;
}

export interface ApiTestGeneratorOptions {
  framework?: TestFramework;
  httpClient?: HttpClient;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  includeAuth?: boolean;
  includeEdgeCases?: boolean;
  includeMocking?: boolean;
}

interface TestCase {
  name: string;
  description?: string;
  method: HttpMethod;
  path: string;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  headers?: Record<string, string>;
  expectedStatus: number | number[];
  expectedHeaders?: Record<string, string>;
  expectedBody?: any;
  validateSchema?: boolean;
}

const FRAMEWORK_IMPORTS: Record<TestFramework, Record<HttpClient, string>> = {
  vitest: {
    fetch: `import { describe, it, expect, beforeAll, afterAll } from 'vitest';`,
    supertest: `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';`,
    axios: `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';`,
    httpx: `import { describe, it, expect } from 'vitest';`,
  },
  jest: {
    fetch: ``,
    supertest: `import request from 'supertest';`,
    axios: `import axios from 'axios';`,
    httpx: ``,
  },
  pytest: {
    fetch: `import pytest
import requests`,
    supertest: `import pytest
import requests`,
    axios: `import pytest
import requests`,
    httpx: `import pytest
import httpx`,
  },
};

/**
 * Generate API tests for scanned routes
 */
export async function generateApiTests(
  scanResult: ApiScanResult,
  options: ApiTestGeneratorOptions = {}
): Promise<GeneratedApiTest[]> {
  const {
    framework = 'vitest',
    httpClient = 'supertest',
    baseUrl = 'http://localhost:3000',
    apiKey,
    model = 'gpt-4o-mini',
    includeAuth = false,
    includeEdgeCases = true,
    includeMocking = false,
  } = options;

  const tests: GeneratedApiTest[] = [];

  // Group routes by resource (base path)
  const routeGroups = groupRoutesByResource(scanResult.routes);

  for (const [resource, routes] of routeGroups) {
    const test = await generateResourceTests(
      resource,
      routes,
      scanResult.openApiSpec,
      {
        framework,
        httpClient,
        baseUrl,
        apiKey: apiKey || '',
        model,
        includeAuth,
        includeEdgeCases,
        includeMocking,
      }
    );
    tests.push(test);
  }

  return tests;
}

/**
 * Generate tests for a single resource group
 */
async function generateResourceTests(
  resource: string,
  routes: ApiRoute[],
  openApiSpec: OpenApiSpec | undefined,
  options: Required<ApiTestGeneratorOptions>
): Promise<GeneratedApiTest> {
  const { framework, httpClient, baseUrl, apiKey, model, includeEdgeCases } = options;

  // Try AI-powered generation if API key is available
  if (apiKey || process.env.OPENAI_API_KEY) {
    try {
      return await generateWithAI(resource, routes, openApiSpec, options);
    } catch (error) {
      console.error('AI generation failed, using template:', error);
    }
  }

  // Fall back to template-based generation
  return generateFromTemplate(resource, routes, openApiSpec, options);
}

/**
 * Generate tests using AI
 */
async function generateWithAI(
  resource: string,
  routes: ApiRoute[],
  openApiSpec: OpenApiSpec | undefined,
  options: Required<ApiTestGeneratorOptions>
): Promise<GeneratedApiTest> {
  const { framework, httpClient, baseUrl, apiKey, model } = options;
  const key = apiKey || process.env.OPENAI_API_KEY;

  const openai = new OpenAI({
    apiKey: key,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const routeDescriptions = routes.map(r => {
    const params = r.parameters?.map(p => `${p.name}:${p.location}`).join(', ') || 'none';
    return `${r.method} ${r.path} (params: ${params}) [${r.framework}]`;
  }).join('\n');

  const openApiInfo = openApiSpec
    ? `\nOpenAPI spec available with ${Object.keys(openApiSpec.paths || {}).length} paths defined.`
    : '';

  const systemPrompt = `You are an expert API test writer. Generate comprehensive API contract tests.

Framework: ${framework}
HTTP Client: ${httpClient}
Base URL: ${baseUrl}

Guidelines:
- Test all HTTP methods for each endpoint
- Test success cases (2xx status codes)
- Test error cases (4xx status codes) 
- Test validation of request parameters
- Test response structure and types
- Include edge cases (empty data, invalid IDs, etc.)
- Use descriptive test names
- Mock external services when appropriate

Output ONLY the test code, no explanations or markdown code blocks.`;

  const userPrompt = `Generate API contract tests for these endpoints:

${routeDescriptions}
${openApiInfo}

Resource: ${resource}
Generate thorough tests covering success cases, error cases, and edge cases.`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });

  let content = response.choices[0]?.message?.content || '';
  content = content.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();

  return {
    framework,
    httpClient,
    filename: getTestFilename(resource, framework),
    content,
    routes,
    description: `API tests for ${resource}`,
  };
}

/**
 * Generate tests from template
 */
function generateFromTemplate(
  resource: string,
  routes: ApiRoute[],
  openApiSpec: OpenApiSpec | undefined,
  options: Required<ApiTestGeneratorOptions>
): GeneratedApiTest {
  const { framework, httpClient, baseUrl, includeEdgeCases, includeAuth } = options;

  const imports = FRAMEWORK_IMPORTS[framework][httpClient];
  const testCases = generateTestCases(routes, openApiSpec, { includeEdgeCases, includeAuth });
  const testBlocks = testCases.map(tc => generateTestBlock(tc, framework, httpClient, baseUrl));

  let content: string;

  if (framework === 'pytest') {
    content = generatePytestContent(resource, imports, testBlocks, baseUrl);
  } else {
    content = generateJestVitestContent(resource, imports, testBlocks, baseUrl, framework);
  }

  return {
    framework,
    httpClient,
    filename: getTestFilename(resource, framework),
    content,
    routes,
    description: `API tests for ${resource}`,
  };
}

/**
 * Generate test cases for routes
 */
function generateTestCases(
  routes: ApiRoute[],
  openApiSpec: OpenApiSpec | undefined,
  options: { includeEdgeCases: boolean; includeAuth: boolean }
): TestCase[] {
  const testCases: TestCase[] = [];

  for (const route of routes) {
    // Success case
    testCases.push({
      name: `${route.method} ${route.path} - success`,
      method: route.method,
      path: route.path,
      pathParams: generateSamplePathParams(route.parameters),
      expectedStatus: getExpectedSuccessStatus(route.method),
      validateSchema: true,
    });

    // Edge cases
    if (options.includeEdgeCases) {
      // Invalid path parameters
      const pathParams = route.parameters?.filter(p => p.location === 'path');
      if (pathParams && pathParams.length > 0) {
        testCases.push({
          name: `${route.method} ${route.path} - invalid ID`,
          method: route.method,
          path: route.path,
          pathParams: { [pathParams[0].name]: 'invalid-id-999999' },
          expectedStatus: [400, 404],
        });
      }

      // Missing required body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        testCases.push({
          name: `${route.method} ${route.path} - missing body`,
          method: route.method,
          path: route.path,
          pathParams: generateSamplePathParams(route.parameters),
          body: {},
          expectedStatus: [400, 422],
        });
      }

      // Method not allowed (if other methods exist for same path)
      const samePath = routes.filter(r => r.path === route.path);
      if (samePath.length > 1) {
        const otherMethods = samePath.map(r => r.method).filter(m => m !== route.method);
        // Test will check that the right method works, implicitly
      }
    }

    // Auth test cases
    if (options.includeAuth) {
      testCases.push({
        name: `${route.method} ${route.path} - unauthorized`,
        method: route.method,
        path: route.path,
        pathParams: generateSamplePathParams(route.parameters),
        headers: {}, // No auth header
        expectedStatus: [401, 403],
      });
    }
  }

  return testCases;
}

/**
 * Generate sample path parameters
 */
function generateSamplePathParams(params?: RouteParameter[]): Record<string, string> {
  if (!params) return {};

  const samples: Record<string, string> = {};
  for (const param of params) {
    if (param.location !== 'path') continue;

    // Generate sample value based on name
    if (param.name.toLowerCase().includes('id')) {
      samples[param.name] = '1';
    } else if (param.name.toLowerCase().includes('slug')) {
      samples[param.name] = 'test-slug';
    } else if (param.name.toLowerCase().includes('name')) {
      samples[param.name] = 'test-name';
    } else {
      samples[param.name] = 'test-value';
    }
  }

  return samples;
}

/**
 * Get expected success status for HTTP method
 */
function getExpectedSuccessStatus(method: HttpMethod): number {
  switch (method) {
    case 'POST': return 201;
    case 'DELETE': return 204;
    default: return 200;
  }
}

/**
 * Generate test block for a test case
 */
function generateTestBlock(
  tc: TestCase,
  framework: TestFramework,
  httpClient: HttpClient,
  baseUrl: string
): string {
  const path = substitutePathParams(tc.path, tc.pathParams);
  const expectedStatus = Array.isArray(tc.expectedStatus)
    ? tc.expectedStatus
    : [tc.expectedStatus];

  if (framework === 'pytest') {
    return generatePytestTestBlock(tc, path, expectedStatus, httpClient, baseUrl);
  }

  return generateJsTestBlock(tc, path, expectedStatus, httpClient, baseUrl);
}

/**
 * Generate JavaScript/TypeScript test block
 */
function generateJsTestBlock(
  tc: TestCase,
  path: string,
  expectedStatus: number[],
  httpClient: HttpClient,
  baseUrl: string
): string {
  const statusCheck = expectedStatus.length === 1
    ? `expect(response.status).toBe(${expectedStatus[0]});`
    : `expect([${expectedStatus.join(', ')}]).toContain(response.status);`;

  const bodyJson = tc.body ? JSON.stringify(tc.body) : undefined;

  if (httpClient === 'supertest') {
    const bodyChain = bodyJson ? `.send(${bodyJson})` : '';
    const headerChain = tc.headers
      ? Object.entries(tc.headers).map(([k, v]) => `.set('${k}', '${v}')`).join('')
      : '';
    return `
  it('${tc.name}', async () => {
    const response = await request(app)
      .${tc.method.toLowerCase()}('${path}')${headerChain}${bodyChain};
    
    ${statusCheck}
  });`;
  }

  if (httpClient === 'axios') {
    const config: string[] = [];
    if (tc.headers) {
      config.push(`headers: ${JSON.stringify(tc.headers)}`);
    }
    const configStr = config.length > 0 ? `, { ${config.join(', ')} }` : '';
    const dataArg = bodyJson ? `, ${bodyJson}` : '';

    return `
  it('${tc.name}', async () => {
    try {
      const response = await axios.${tc.method.toLowerCase()}('${baseUrl}${path}'${dataArg}${configStr});
      ${statusCheck.replace('response.status', 'response.status')}
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        ${statusCheck.replace('response.status', 'error.response.status')}
      } else {
        throw error;
      }
    }
  });`;
  }

  // Default to fetch
  const fetchOptions: string[] = [`method: '${tc.method}'`];
  if (tc.headers) {
    fetchOptions.push(`headers: ${JSON.stringify(tc.headers)}`);
  }
  if (bodyJson) {
    fetchOptions.push(`body: JSON.stringify(${bodyJson})`);
    if (!tc.headers?.['Content-Type']) {
      fetchOptions[1] = fetchOptions[1] || 'headers: {}';
      // Add content-type for body
    }
  }

  return `
  it('${tc.name}', async () => {
    const response = await fetch('${baseUrl}${path}', {
      ${fetchOptions.join(',\n      ')},
    });
    
    ${statusCheck}
  });`;
}

/**
 * Generate pytest test block
 */
function generatePytestTestBlock(
  tc: TestCase,
  path: string,
  expectedStatus: number[],
  httpClient: HttpClient,
  baseUrl: string
): string {
  const statusCheck = expectedStatus.length === 1
    ? `assert response.status_code == ${expectedStatus[0]}`
    : `assert response.status_code in [${expectedStatus.join(', ')}]`;

  const method = tc.method.toLowerCase();
  const testName = tc.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const jsonArg = tc.body ? `, json=${JSON.stringify(tc.body).replace(/"/g, "'")}` : '';
  const headersArg = tc.headers ? `, headers=${JSON.stringify(tc.headers).replace(/"/g, "'")}` : '';

  if (httpClient === 'httpx') {
    return `
def test_${testName}(client):
    response = client.${method}('${path}'${jsonArg}${headersArg})
    ${statusCheck}`;
  }

  return `
def test_${testName}():
    response = requests.${method}('${baseUrl}${path}'${jsonArg}${headersArg})
    ${statusCheck}`;
}

/**
 * Generate complete pytest file content
 */
function generatePytestContent(
  resource: string,
  imports: string,
  testBlocks: string[],
  baseUrl: string
): string {
  return `"""API contract tests for ${resource}"""
${imports}

BASE_URL = '${baseUrl}'

@pytest.fixture
def client():
    """HTTP client fixture."""
    with httpx.Client(base_url=BASE_URL) as client:
        yield client

class Test${toPascalCase(resource)}Api:
    """Tests for ${resource} API endpoints."""
${testBlocks.join('\n')}
`;
}

/**
 * Generate complete Jest/Vitest file content
 */
function generateJestVitestContent(
  resource: string,
  imports: string,
  testBlocks: string[],
  baseUrl: string,
  framework: TestFramework
): string {
  const appImport = `import app from '../src/app'; // Adjust path as needed`;

  return `/**
 * API contract tests for ${resource}
 */
${imports}
${framework === 'vitest' || framework === 'jest' ? '' : appImport}

const BASE_URL = '${baseUrl}';

describe('${resource} API', () => {
  // Setup and teardown if needed
  beforeAll(async () => {
    // Start server or setup test database
  });

  afterAll(async () => {
    // Cleanup
  });
${testBlocks.join('\n')}
});
`;
}

/**
 * Substitute path parameters in URL
 */
function substitutePathParams(path: string, params?: Record<string, string>): string {
  if (!params) return path;

  let result = path;
  for (const [key, value] of Object.entries(params)) {
    result = result
      .replace(`:${key}`, value)
      .replace(`{${key}}`, value)
      .replace(`[${key}]`, value);
  }
  return result;
}

/**
 * Group routes by resource (base path)
 */
function groupRoutesByResource(routes: ApiRoute[]): Map<string, ApiRoute[]> {
  const groups = new Map<string, ApiRoute[]>();

  for (const route of routes) {
    // Extract resource from path (e.g., /api/users/:id -> users)
    const segments = route.path.split('/').filter(Boolean);
    let resource = segments[1] || segments[0] || 'root';

    // Remove 'api' prefix if present
    if (resource === 'api' && segments[2]) {
      resource = segments[2];
    }

    if (!groups.has(resource)) {
      groups.set(resource, []);
    }
    groups.get(resource)!.push(route);
  }

  return groups;
}

/**
 * Get test filename for a resource
 */
function getTestFilename(resource: string, framework: TestFramework): string {
  const safeName = resource.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  if (framework === 'pytest') {
    return `test_${safeName}_api.py`;
  }

  return `${safeName}.api.test.ts`;
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-z0-9]/gi, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Generate a comprehensive API test suite from OpenAPI spec
 */
export async function generateFromOpenApi(
  spec: OpenApiSpec,
  options: ApiTestGeneratorOptions = {}
): Promise<GeneratedApiTest[]> {
  const routes: ApiRoute[] = [];

  // Convert OpenAPI paths to ApiRoute format
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, details] of Object.entries(methods)) {
      const httpMethod = method.toUpperCase() as HttpMethod;
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(httpMethod)) {
        continue;
      }

      const parameters: RouteParameter[] = (details.parameters || []).map((p: any) => ({
        name: p.name,
        location: p.in as any,
        type: p.schema?.type,
        required: p.required || false,
        description: p.description,
      }));

      routes.push({
        method: httpMethod,
        path,
        file: 'openapi.json',
        line: 0,
        framework: 'unknown',
        parameters,
        description: details.summary,
      });
    }
  }

  // Use existing generation logic
  return generateApiTests(
    {
      rootDir: '.',
      routes,
      stats: {
        total: routes.length,
        byMethod: {} as any,
        byFramework: {},
        filesScanned: 1,
      },
      openApiSpec: spec,
    },
    options
  );
}

/**
 * Validate an API response against expected schema
 */
export function validateResponse(
  response: { status: number; headers: Record<string, string>; body: any },
  expected: {
    status?: number | number[];
    headers?: Record<string, string>;
    bodySchema?: any;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate status
  if (expected.status !== undefined) {
    const expectedStatuses = Array.isArray(expected.status) ? expected.status : [expected.status];
    if (!expectedStatuses.includes(response.status)) {
      errors.push(`Expected status ${expectedStatuses.join(' or ')}, got ${response.status}`);
    }
  }

  // Validate headers
  if (expected.headers) {
    for (const [key, value] of Object.entries(expected.headers)) {
      const actual = response.headers[key.toLowerCase()];
      if (actual !== value) {
        errors.push(`Expected header ${key}=${value}, got ${actual}`);
      }
    }
  }

  // Basic body schema validation (type checking)
  if (expected.bodySchema) {
    const schemaErrors = validateSchema(response.body, expected.bodySchema);
    errors.push(...schemaErrors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Simple JSON schema validation
 */
function validateSchema(data: any, schema: any, path = ''): string[] {
  const errors: string[] = [];

  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push(`${path}: expected object, got ${typeof data}`);
      return errors;
    }

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`${path}.${field}: required field missing`);
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          errors.push(...validateSchema(data[key], propSchema as any, `${path}.${key}`));
        }
      }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push(`${path}: expected array, got ${typeof data}`);
      return errors;
    }

    if (schema.items) {
      data.forEach((item, i) => {
        errors.push(...validateSchema(item, schema.items, `${path}[${i}]`));
      });
    }
  } else if (schema.type === 'string' && typeof data !== 'string') {
    errors.push(`${path}: expected string, got ${typeof data}`);
  } else if (schema.type === 'number' && typeof data !== 'number') {
    errors.push(`${path}: expected number, got ${typeof data}`);
  } else if (schema.type === 'boolean' && typeof data !== 'boolean') {
    errors.push(`${path}: expected boolean, got ${typeof data}`);
  }

  return errors;
}
