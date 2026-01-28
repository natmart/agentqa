import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  scanApiRoutes,
  formatRoutes,
  groupRoutesByPath,
  type ApiRoute,
  type ApiScanResult,
} from './api-scanner.js';

describe('API Scanner', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    testDir = join(tmpdir(), `api-scanner-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Express route detection', () => {
    it('should detect app.get routes', async () => {
      const content = `
import express from 'express';
const app = express();

app.get('/users', (req, res) => {
  res.json([]);
});

app.get('/users/:id', (req, res) => {
  res.json({});
});
`;
      await writeFile(join(testDir, 'app.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(2);
      expect(result.routes[0].method).toBe('GET');
      expect(result.routes[0].path).toBe('/users');
      expect(result.routes[0].framework).toBe('express');
      expect(result.routes[1].path).toBe('/users/:id');
      expect(result.routes[1].parameters).toContainEqual({
        name: 'id',
        location: 'path',
        required: true,
      });
    });

    it('should detect router methods', async () => {
      const content = `
import { Router } from 'express';
const router = Router();

router.post('/items', createItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);
router.patch('/items/:id', patchItem);

export default router;
`;
      await writeFile(join(testDir, 'items.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(4);
      expect(result.routes.map(r => r.method)).toEqual(['POST', 'PUT', 'DELETE', 'PATCH']);
    });

    it('should detect route.route() chain pattern', async () => {
      const content = `
import express from 'express';
const router = express.Router();

router.route('/products')
  .get(getAllProducts)
  .post(createProduct);

router.route('/products/:id')
  .get(getProduct)
  .put(updateProduct);
`;
      await writeFile(join(testDir, 'products.ts'), content);

      const result = await scanApiRoutes(testDir);

      // Should find chained routes
      expect(result.routes.some(r => r.path === '/products' && r.method === 'GET')).toBe(true);
      expect(result.routes.some(r => r.path === '/products' && r.method === 'POST')).toBe(true);
    });

    it('should detect middleware in routes', async () => {
      const content = `
import express from 'express';
const app = express();

app.get('/admin', authMiddleware, adminOnly, (req, res) => {
  res.json({ admin: true });
});
`;
      await writeFile(join(testDir, 'admin.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].middleware).toContain('authMiddleware');
      expect(result.routes[0].middleware).toContain('adminOnly');
    });
  });

  describe('Hono route detection', () => {
    it('should detect Hono app routes', async () => {
      const content = `
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => c.json({ status: 'ok' }));
app.post('/api/users', async (c) => {
  const body = await c.req.json();
  return c.json(body);
});
`;
      await writeFile(join(testDir, 'hono-app.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(2);
      expect(result.routes[0].method).toBe('GET');
      expect(result.routes[0].path).toBe('/api/health');
      expect(result.routes[0].framework).toBe('hono');
      expect(result.routes[1].method).toBe('POST');
    });

    it('should detect Hono router routes', async () => {
      const content = `
import { Hono } from 'hono';
const api = new Hono();

api.get('/items', listItems);
api.get('/items/:id', getItem);
api.delete('/items/:id', deleteItem);

export { api };
`;
      await writeFile(join(testDir, 'hono-router.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(3);
      expect(result.routes.map(r => r.method)).toContain('GET');
      expect(result.routes.map(r => r.method)).toContain('DELETE');
    });
  });

  describe('Next.js route detection', () => {
    it('should detect App Router route handlers', async () => {
      const content = `
export async function GET(request: Request) {
  return Response.json({ users: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json(body, { status: 201 });
}
`;
      const apiDir = join(testDir, 'app', 'api', 'users');
      await mkdir(apiDir, { recursive: true });
      await writeFile(join(apiDir, 'route.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(2);
      expect(result.routes[0].framework).toBe('nextjs');
      expect(result.routes[0].path).toBe('/api/users');
      expect(result.routes.map(r => r.method)).toContain('GET');
      expect(result.routes.map(r => r.method)).toContain('POST');
    });

    it('should detect dynamic route segments', async () => {
      const content = `
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return Response.json({ id: params.id });
}

export async function DELETE(request: Request) {
  return new Response(null, { status: 204 });
}
`;
      const apiDir = join(testDir, 'app', 'api', 'users', '[id]');
      await mkdir(apiDir, { recursive: true });
      await writeFile(join(apiDir, 'route.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(2);
      expect(result.routes[0].path).toBe('/api/users/:id');
      expect(result.routes[0].parameters).toContainEqual({
        name: 'id',
        location: 'path',
        required: true,
      });
    });

    it('should detect Pages Router API routes', async () => {
      const content = `
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ posts: [] });
  } else if (req.method === 'POST') {
    res.status(201).json(req.body);
  }
}
`;
      const apiDir = join(testDir, 'pages', 'api');
      await mkdir(apiDir, { recursive: true });
      await writeFile(join(apiDir, 'posts.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes.length).toBeGreaterThanOrEqual(2);
      expect(result.routes[0].framework).toBe('nextjs');
      expect(result.routes[0].path).toBe('/api/posts');
    });
  });

  describe('Fastify route detection', () => {
    it('should detect Fastify routes', async () => {
      const content = `
import fastify from 'fastify';

const server = fastify();

server.get('/api/status', async () => {
  return { status: 'ok' };
});

server.post('/api/orders', { schema: orderSchema }, async (request) => {
  return request.body;
});
`;
      await writeFile(join(testDir, 'fastify-app.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(2);
      expect(result.routes[0].method).toBe('GET');
      expect(result.routes[0].framework).toBe('fastify');
    });

    it('should detect Fastify route object pattern', async () => {
      const content = `
import fastify from 'fastify';

const app = fastify();

app.route({
  method: 'GET',
  url: '/items/:id',
  handler: async (request) => {
    return { id: request.params.id };
  }
});

app.route({
  method: 'POST',
  url: '/items',
  handler: createItem
});
`;
      await writeFile(join(testDir, 'fastify-routes.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('OpenAPI spec detection', () => {
    it('should find and parse OpenAPI spec', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };
      await writeFile(join(testDir, 'openapi.json'), JSON.stringify(spec));

      const result = await scanApiRoutes(testDir);

      expect(result.openApiSpec).toBeDefined();
      expect(result.openApiSpec?.openapi).toBe('3.0.0');
      expect(result.openApiSpec?.info.title).toBe('Test API');
    });

    it('should merge OpenAPI info into routes', async () => {
      // Create Express route
      const routeContent = `
import express from 'express';
const app = express();
app.get('/users', listUsers);
`;
      await writeFile(join(testDir, 'routes.ts'), routeContent);

      // Create OpenAPI spec with additional info
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List all users',
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
              ],
              responses: { '200': { description: 'User list' } },
            },
          },
        },
      };
      await writeFile(join(testDir, 'openapi.json'), JSON.stringify(spec));

      const result = await scanApiRoutes(testDir);

      const usersRoute = result.routes.find(r => r.path === '/users');
      expect(usersRoute?.description).toBe('List all users');
      expect(usersRoute?.parameters).toContainEqual({
        name: 'limit',
        location: 'query',
        type: 'integer',
        required: undefined,
      });
    });
  });

  describe('Statistics', () => {
    it('should calculate correct statistics', async () => {
      const content = `
import express from 'express';
const app = express();

app.get('/users', listUsers);
app.post('/users', createUser);
app.get('/users/:id', getUser);
app.put('/users/:id', updateUser);
app.delete('/users/:id', deleteUser);
`;
      await writeFile(join(testDir, 'api.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.stats.total).toBe(5);
      expect(result.stats.byMethod.GET).toBe(2);
      expect(result.stats.byMethod.POST).toBe(1);
      expect(result.stats.byMethod.PUT).toBe(1);
      expect(result.stats.byMethod.DELETE).toBe(1);
      expect(result.stats.byFramework.express).toBe(5);
      expect(result.stats.filesScanned).toBe(1);
    });
  });

  describe('Path parameter extraction', () => {
    it('should extract colon-style parameters', async () => {
      const content = `
import express from 'express';
const app = express();
app.get('/users/:userId/posts/:postId', handler);
`;
      await writeFile(join(testDir, 'params.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes[0].parameters).toHaveLength(2);
      expect(result.routes[0].parameters?.[0].name).toBe('userId');
      expect(result.routes[0].parameters?.[1].name).toBe('postId');
    });

    it('should extract bracket-style parameters (Next.js)', async () => {
      const content = `
export async function GET() {
  return Response.json({});
}
`;
      const apiDir = join(testDir, 'app', 'api', 'posts', '[postId]', 'comments', '[commentId]');
      await mkdir(apiDir, { recursive: true });
      await writeFile(join(apiDir, 'route.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes[0].path).toBe('/api/posts/:postId/comments/:commentId');
      expect(result.routes[0].parameters).toHaveLength(2);
    });
  });

  describe('formatRoutes', () => {
    it('should format routes for display', () => {
      const routes: ApiRoute[] = [
        {
          method: 'GET',
          path: '/users',
          file: 'routes.ts',
          line: 5,
          framework: 'express',
        },
        {
          method: 'POST',
          path: '/users',
          file: 'routes.ts',
          line: 10,
          framework: 'express',
        },
        {
          method: 'GET',
          path: '/users/:id',
          file: 'routes.ts',
          line: 15,
          framework: 'express',
          parameters: [{ name: 'id', location: 'path', required: true }],
        },
      ];

      const output = formatRoutes(routes);

      expect(output).toContain('GET');
      expect(output).toContain('POST');
      expect(output).toContain('/users');
      expect(output).toContain('/users/:id');
      expect(output).toContain(':id');
      expect(output).toContain('[express]');
    });
  });

  describe('groupRoutesByPath', () => {
    it('should group routes by base path', () => {
      const routes: ApiRoute[] = [
        { method: 'GET', path: '/api/users', file: 'a.ts', line: 1, framework: 'express' },
        { method: 'POST', path: '/api/users', file: 'a.ts', line: 2, framework: 'express' },
        { method: 'GET', path: '/api/users/:id', file: 'a.ts', line: 3, framework: 'express' },
        { method: 'GET', path: '/api/posts', file: 'b.ts', line: 1, framework: 'express' },
        { method: 'GET', path: '/api/posts/:id', file: 'b.ts', line: 2, framework: 'express' },
      ];

      const groups = groupRoutesByPath(routes);

      expect(groups.size).toBe(2);
      expect(groups.get('/api/users')).toHaveLength(3);
      expect(groups.get('/api/posts')).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle files with no routes', async () => {
      const content = `
const config = {
  port: 3000,
};
export default config;
`;
      await writeFile(join(testDir, 'config.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });

    it('should ignore test files', async () => {
      const content = `
import express from 'express';
const app = express();
app.get('/test', handler);
`;
      await writeFile(join(testDir, 'routes.test.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(0);
    });

    it('should handle mixed frameworks', async () => {
      const expressContent = `
import express from 'express';
const app = express();
app.get('/express/route', handler);
`;
      const honoContent = `
import { Hono } from 'hono';
const app = new Hono();
app.get('/hono/route', handler);
`;
      await writeFile(join(testDir, 'express.ts'), expressContent);
      await writeFile(join(testDir, 'hono.ts'), honoContent);

      const result = await scanApiRoutes(testDir);

      expect(result.routes).toHaveLength(2);
      expect(result.stats.byFramework.express).toBe(1);
      expect(result.stats.byFramework.hono).toBe(1);
    });

    it('should normalize paths correctly', async () => {
      const content = `
import express from 'express';
const app = express();
app.get('users', handler);  // Missing leading slash
app.get('/items/', handler); // Trailing slash
`;
      await writeFile(join(testDir, 'routes.ts'), content);

      const result = await scanApiRoutes(testDir);

      expect(result.routes[0].path).toBe('/users');
      expect(result.routes[1].path).toBe('/items');
    });
  });
});
