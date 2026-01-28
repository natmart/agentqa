import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { api } from './api/routes.js';

const app = new Hono();

// Mount API routes
app.route('/api', api);

// Serve static files from public directory
app.use('/*', serveStatic({ root: './public' }));

// Fallback to index.html for SPA
app.get('/', async (c) => {
  const fs = await import('fs/promises');
  try {
    const html = await fs.readFile('./public/index.html', 'utf-8');
    return c.html(html);
  } catch {
    return c.text('AgentQA API Server. Visit /api/health for status.');
  }
});

const port = parseInt(process.env.PORT || '3847', 10);

console.log(`🚀 AgentQA server running at http://localhost:${port}`);
console.log(`📡 API available at http://localhost:${port}/api`);

serve({
  fetch: app.fetch,
  port,
});

export { app };
