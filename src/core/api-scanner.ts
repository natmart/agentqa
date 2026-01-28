/**
 * API Scanner - Detects API routes in a codebase
 * 
 * Supports:
 * - Express routes (app.get, router.post, etc.)
 * - Hono routes
 * - Next.js API routes (pages/api and app/api)
 * - Fastify routes
 */

import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { basename, dirname, extname, relative, join } from 'path';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ALL';

export interface RouteParameter {
  name: string;
  location: 'path' | 'query' | 'body' | 'header';
  type?: string;
  required?: boolean;
  description?: string;
}

export interface ApiRoute {
  method: HttpMethod;
  path: string;
  handler?: string;
  file: string;
  line: number;
  framework: 'express' | 'hono' | 'nextjs' | 'fastify' | 'unknown';
  parameters?: RouteParameter[];
  middleware?: string[];
  description?: string;
}

export interface ApiScanResult {
  rootDir: string;
  routes: ApiRoute[];
  stats: {
    total: number;
    byMethod: Record<HttpMethod, number>;
    byFramework: Record<string, number>;
    filesScanned: number;
  };
  openApiSpec?: OpenApiSpec;
}

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, {
    summary?: string;
    parameters?: Array<{
      name: string;
      in: string;
      required?: boolean;
      schema?: { type: string };
    }>;
    requestBody?: {
      content: Record<string, { schema: any }>;
    };
    responses: Record<string, {
      description: string;
      content?: Record<string, { schema: any }>;
    }>;
  }>>;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ALL'];

const API_FILE_PATTERNS = [
  '**/*.{ts,tsx,js,jsx,mjs}',
];

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/*.test.{ts,tsx,js,jsx}',
  '**/*.spec.{ts,tsx,js,jsx}',
  '**/__tests__/**',
];

/**
 * Scan a codebase for API routes
 */
export async function scanApiRoutes(rootDir: string): Promise<ApiScanResult> {
  const routes: ApiRoute[] = [];
  let openApiSpec: OpenApiSpec | undefined;

  // Try to find OpenAPI/Swagger spec
  openApiSpec = await findOpenApiSpec(rootDir);

  // Find all potential API files
  const files = await glob(API_FILE_PATTERNS, {
    cwd: rootDir,
    ignore: IGNORE_PATTERNS,
    absolute: true,
  });

  let filesScanned = 0;

  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      const relativePath = relative(rootDir, file);

      // Detect framework and extract routes
      const fileRoutes = extractRoutes(content, relativePath, file);
      routes.push(...fileRoutes);

      if (fileRoutes.length > 0) {
        filesScanned++;
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Merge with OpenAPI spec if available
  if (openApiSpec) {
    mergeOpenApiRoutes(routes, openApiSpec);
  }

  // Calculate stats
  const stats = calculateStats(routes, filesScanned);

  return { rootDir, routes, stats, openApiSpec };
}

/**
 * Find and parse OpenAPI/Swagger specification
 */
async function findOpenApiSpec(rootDir: string): Promise<OpenApiSpec | undefined> {
  const specPatterns = [
    'openapi.json',
    'openapi.yaml',
    'openapi.yml',
    'swagger.json',
    'swagger.yaml',
    'swagger.yml',
    'api/openapi.json',
    'api/swagger.json',
    'docs/openapi.json',
    'docs/swagger.json',
  ];

  for (const pattern of specPatterns) {
    try {
      const specPath = join(rootDir, pattern);
      const content = await readFile(specPath, 'utf-8');

      if (pattern.endsWith('.json')) {
        return JSON.parse(content);
      } else {
        // Basic YAML parsing (simplified - in production use yaml library)
        // For now, skip YAML files or assume JSON-like structure
        try {
          return JSON.parse(content);
        } catch {
          // Skip YAML files that can't be parsed as JSON
        }
      }
    } catch {
      // File not found, continue
    }
  }

  return undefined;
}

/**
 * Extract routes from file content
 */
function extractRoutes(content: string, relativePath: string, absolutePath: string): ApiRoute[] {
  const routes: ApiRoute[] = [];
  const lines = content.split('\n');

  // Detect framework
  const framework = detectFramework(content);

  switch (framework) {
    case 'express':
      routes.push(...extractExpressRoutes(content, lines, relativePath, absolutePath));
      break;
    case 'hono':
      routes.push(...extractHonoRoutes(content, lines, relativePath, absolutePath));
      break;
    case 'nextjs':
      routes.push(...extractNextjsRoutes(content, lines, relativePath, absolutePath));
      break;
    case 'fastify':
      routes.push(...extractFastifyRoutes(content, lines, relativePath, absolutePath));
      break;
    default:
      // Try all extractors for unknown frameworks
      routes.push(...extractExpressRoutes(content, lines, relativePath, absolutePath));
      routes.push(...extractHonoRoutes(content, lines, relativePath, absolutePath));
  }

  return routes;
}

/**
 * Detect which framework the file uses
 */
function detectFramework(content: string): 'express' | 'hono' | 'nextjs' | 'fastify' | 'unknown' {
  // Check imports/requires
  if (/from ['"]express['"]|require\(['"]express['"]\)/.test(content)) {
    return 'express';
  }
  if (/from ['"]hono['"]|require\(['"]hono['"]\)/.test(content)) {
    return 'hono';
  }
  if (/from ['"]fastify['"]|require\(['"]fastify['"]\)/.test(content)) {
    return 'fastify';
  }
  // Next.js detection based on file path or exports
  if (/export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/.test(content)) {
    return 'nextjs';
  }
  if (/export\s+default\s+(?:async\s+)?function\s+handler/.test(content)) {
    return 'nextjs';
  }

  return 'unknown';
}

/**
 * Extract Express routes
 */
function extractExpressRoutes(
  content: string,
  lines: string[],
  relativePath: string,
  absolutePath: string
): ApiRoute[] {
  const routes: ApiRoute[] = [];

  // Match patterns like: app.get('/path', handler) or router.post('/path', middleware, handler)
  const routePattern = /(?:app|router|route)\.(get|post|put|patch|delete|head|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

  let match;
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1].toUpperCase() as HttpMethod;
    const path = match[2];
    const line = getLineNumber(content, match.index);

    // Extract handler name if possible
    const handler = extractHandlerName(content, match.index);

    // Extract middleware
    const middleware = extractMiddleware(content, match.index);

    routes.push({
      method,
      path: normalizePath(path),
      handler,
      file: relativePath,
      line,
      framework: 'express',
      middleware,
      parameters: extractPathParameters(path),
    });
  }

  // Also match Router.route('/path').get().post() pattern
  // First find all route() declarations
  const routeDeclPattern = /\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  while ((match = routeDeclPattern.exec(content)) !== null) {
    const path = match[1];
    const startIndex = match.index + match[0].length;
    const line = getLineNumber(content, match.index);

    // Look for chained methods after the route declaration
    // Get the rest of the line/statement
    const afterRoute = content.substring(startIndex, startIndex + 500);
    
    // Match all chained HTTP methods
    const chainedMethods = /\.(get|post|put|patch|delete|head|options)\s*\(/gi;
    let methodMatch;
    while ((methodMatch = chainedMethods.exec(afterRoute)) !== null) {
      const method = methodMatch[1].toUpperCase() as HttpMethod;
      
      // Check if route already exists (from the first pattern)
      const exists = routes.some(
        r => r.path === normalizePath(path) && r.method === method
      );
      
      if (!exists) {
        routes.push({
          method,
          path: normalizePath(path),
          file: relativePath,
          line,
          framework: 'express',
          parameters: extractPathParameters(path),
        });
      }
    }
  }

  return routes;
}

/**
 * Extract Hono routes
 */
function extractHonoRoutes(
  content: string,
  lines: string[],
  relativePath: string,
  absolutePath: string
): ApiRoute[] {
  const routes: ApiRoute[] = [];

  // Match patterns like: app.get('/path', (c) => ...) or api.post('/path', handler)
  const routePattern = /(?:app|api|router|hono)\.(get|post|put|patch|delete|head|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

  let match;
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1].toUpperCase() as HttpMethod;
    const path = match[2];
    const line = getLineNumber(content, match.index);

    routes.push({
      method,
      path: normalizePath(path),
      file: relativePath,
      line,
      framework: 'hono',
      parameters: extractPathParameters(path),
    });
  }

  return routes;
}

/**
 * Extract Next.js API routes
 */
function extractNextjsRoutes(
  content: string,
  lines: string[],
  relativePath: string,
  absolutePath: string
): ApiRoute[] {
  const routes: ApiRoute[] = [];

  // Determine API path from file path
  const apiPath = nextjsFileToApiPath(relativePath);
  if (!apiPath) return routes;

  // App Router: export async function GET/POST/etc
  const appRouterPattern = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g;
  let match;
  while ((match = appRouterPattern.exec(content)) !== null) {
    const method = match[1] as HttpMethod;
    const line = getLineNumber(content, match.index);

    routes.push({
      method,
      path: apiPath,
      handler: method,
      file: relativePath,
      line,
      framework: 'nextjs',
      parameters: extractPathParameters(apiPath),
    });
  }

  // Pages Router: export default function handler with req.method checks
  if (/export\s+default\s+(?:async\s+)?function/.test(content)) {
    // Look for method checks
    const methodChecks = /req\.method\s*===?\s*['"`](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"`]/gi;
    const foundMethods = new Set<HttpMethod>();

    while ((match = methodChecks.exec(content)) !== null) {
      foundMethods.add(match[1].toUpperCase() as HttpMethod);
    }

    // If no explicit method checks, assume all methods
    if (foundMethods.size === 0) {
      foundMethods.add('ALL');
    }

    for (const method of foundMethods) {
      routes.push({
        method,
        path: apiPath,
        handler: 'handler',
        file: relativePath,
        line: 1,
        framework: 'nextjs',
        parameters: extractPathParameters(apiPath),
      });
    }
  }

  return routes;
}

/**
 * Extract Fastify routes
 */
function extractFastifyRoutes(
  content: string,
  lines: string[],
  relativePath: string,
  absolutePath: string
): ApiRoute[] {
  const routes: ApiRoute[] = [];

  // Match patterns like: fastify.get('/path', handler) or server.post('/path', { schema }, handler)
  const routePattern = /(?:fastify|server|app)\.(get|post|put|patch|delete|head|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

  let match;
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1].toUpperCase() as HttpMethod;
    const path = match[2];
    const line = getLineNumber(content, match.index);

    routes.push({
      method,
      path: normalizePath(path),
      file: relativePath,
      line,
      framework: 'fastify',
      parameters: extractPathParameters(path),
    });
  }

  // Also match fastify.route({ method, url, handler }) pattern
  const routeObjectPattern = /\.route\s*\(\s*\{[^}]*method:\s*['"`](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"`][^}]*url:\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = routeObjectPattern.exec(content)) !== null) {
    const method = match[1].toUpperCase() as HttpMethod;
    const path = match[2];
    const line = getLineNumber(content, match.index);

    routes.push({
      method,
      path: normalizePath(path),
      file: relativePath,
      line,
      framework: 'fastify',
      parameters: extractPathParameters(path),
    });
  }

  return routes;
}

/**
 * Convert Next.js file path to API route path
 */
function nextjsFileToApiPath(filePath: string): string | null {
  // App Router: app/api/users/route.ts -> /api/users
  let match = filePath.match(/app\/api\/(.*)\/route\.(ts|tsx|js|jsx)$/);
  if (match) {
    return '/api/' + match[1].replace(/\[([^\]]+)\]/g, ':$1');
  }

  // Pages Router: pages/api/users.ts -> /api/users
  match = filePath.match(/pages\/api\/(.*)\.(ts|tsx|js|jsx)$/);
  if (match) {
    const path = match[1]
      .replace(/\/index$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');
    return '/api/' + path;
  }

  // Also handle src/app and src/pages patterns
  match = filePath.match(/src\/app\/api\/(.*)\/route\.(ts|tsx|js|jsx)$/);
  if (match) {
    return '/api/' + match[1].replace(/\[([^\]]+)\]/g, ':$1');
  }

  match = filePath.match(/src\/pages\/api\/(.*)\.(ts|tsx|js|jsx)$/);
  if (match) {
    const path = match[1]
      .replace(/\/index$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');
    return '/api/' + path;
  }

  return null;
}

/**
 * Normalize route path
 */
function normalizePath(path: string): string {
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  // Remove trailing slash (except for root)
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
}

/**
 * Extract path parameters from route path
 */
function extractPathParameters(path: string): RouteParameter[] {
  const params: RouteParameter[] = [];

  // Match :param or {param} patterns
  const colonPattern = /:(\w+)/g;
  const bracePattern = /\{(\w+)\}/g;
  const bracketPattern = /\[(\w+)\]/g;

  let match: RegExpExecArray | null;
  while ((match = colonPattern.exec(path)) !== null) {
    params.push({
      name: match[1],
      location: 'path',
      required: true,
    });
  }

  while ((match = bracePattern.exec(path)) !== null) {
    const paramName = match[1];
    if (!params.some(p => p.name === paramName)) {
      params.push({
        name: paramName,
        location: 'path',
        required: true,
      });
    }
  }

  while ((match = bracketPattern.exec(path)) !== null) {
    const paramName = match[1];
    if (!params.some(p => p.name === paramName)) {
      params.push({
        name: paramName,
        location: 'path',
        required: !paramName.startsWith('...'), // [...slug] is optional
      });
    }
  }

  return params;
}

/**
 * Get line number from string index
 */
function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

/**
 * Extract handler function name
 */
function extractHandlerName(content: string, routeIndex: number): string | undefined {
  // Look for the handler in the route definition
  const afterRoute = content.substring(routeIndex, routeIndex + 500);

  // Match handler reference (not inline function)
  const handlerMatch = afterRoute.match(/,\s*(\w+)\s*\)/);
  if (handlerMatch && !['async', 'function', 'req', 'res', 'ctx', 'c'].includes(handlerMatch[1])) {
    return handlerMatch[1];
  }

  return undefined;
}

/**
 * Extract middleware from route definition
 */
function extractMiddleware(content: string, routeIndex: number): string[] {
  const middleware: string[] = [];
  const afterRoute = content.substring(routeIndex, routeIndex + 500);

  // Look for middleware between route path and handler
  // Pattern: app.get('/path', middleware1, middleware2, handler)
  const middlewareMatch = afterRoute.match(/['"`][^'"`]+['"`]\s*,\s*([^)]+)\)/);
  if (middlewareMatch) {
    const parts = middlewareMatch[1].split(',').map(p => p.trim());
    // Last part is usually the handler, rest are middleware
    for (let i = 0; i < parts.length - 1; i++) {
      const mw = parts[i].replace(/\s+/g, '');
      if (mw && !mw.startsWith('(') && !mw.startsWith('async')) {
        middleware.push(mw);
      }
    }
  }

  return middleware;
}

/**
 * Merge OpenAPI spec routes with detected routes
 */
function mergeOpenApiRoutes(routes: ApiRoute[], spec: OpenApiSpec): void {
  if (!spec.paths) return;

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, details] of Object.entries(methods)) {
      if (!HTTP_METHODS.includes(method.toUpperCase() as HttpMethod)) continue;

      // Find matching route
      const existingRoute = routes.find(
        r => r.path === path && r.method === method.toUpperCase()
      );

      if (existingRoute) {
        // Enhance existing route with OpenAPI info
        if (details.summary) {
          existingRoute.description = details.summary;
        }
        if (details.parameters) {
          for (const param of details.parameters) {
            const existing = existingRoute.parameters?.find(p => p.name === param.name);
            if (existing) {
              existing.type = param.schema?.type;
              existing.required = param.required;
            } else {
              existingRoute.parameters = existingRoute.parameters || [];
              existingRoute.parameters.push({
                name: param.name,
                location: param.in as any,
                type: param.schema?.type,
                required: param.required,
              });
            }
          }
        }
      }
    }
  }
}

/**
 * Calculate statistics from routes
 */
function calculateStats(
  routes: ApiRoute[],
  filesScanned: number
): ApiScanResult['stats'] {
  const byMethod: Record<HttpMethod, number> = {
    GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0, HEAD: 0, OPTIONS: 0, ALL: 0,
  };
  const byFramework: Record<string, number> = {};

  for (const route of routes) {
    byMethod[route.method]++;
    byFramework[route.framework] = (byFramework[route.framework] || 0) + 1;
  }

  return {
    total: routes.length,
    byMethod,
    byFramework,
    filesScanned,
  };
}

/**
 * Group routes by base path
 */
export function groupRoutesByPath(routes: ApiRoute[]): Map<string, ApiRoute[]> {
  const groups = new Map<string, ApiRoute[]>();

  for (const route of routes) {
    // Extract base path (first segment)
    const basePath = route.path.split('/').slice(0, 3).join('/') || '/';

    if (!groups.has(basePath)) {
      groups.set(basePath, []);
    }
    groups.get(basePath)!.push(route);
  }

  return groups;
}

/**
 * Format routes for display
 */
export function formatRoutes(routes: ApiRoute[]): string {
  const lines: string[] = [];

  // Sort by path then method
  const sorted = [...routes].sort((a, b) => {
    const pathCompare = a.path.localeCompare(b.path);
    return pathCompare !== 0 ? pathCompare : a.method.localeCompare(b.method);
  });

  for (const route of sorted) {
    const methodPad = route.method.padEnd(7);
    const params = route.parameters?.map(p => `:${p.name}`).join(', ') || '';
    const paramsStr = params ? ` (${params})` : '';
    lines.push(`${methodPad} ${route.path}${paramsStr}`);
    lines.push(`        └─ ${route.file}:${route.line} [${route.framework}]`);
  }

  return lines.join('\n');
}
