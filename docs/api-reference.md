# API Reference

AgentQA provides a REST API for integration with CI/CD pipelines and custom tooling.

## Starting the Server

```bash
# Using CLI
agentqa serve

# Using npm
npm start

# Custom port
agentqa serve --port 8080
PORT=8080 npm start
```

**Default:** `http://localhost:3847`

---

## Authentication

For the open-source version, no authentication is required.

For team deployments with billing, include your license key:

```bash
curl -X POST http://localhost:3847/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer AQAT-XXXX-XXXX-XXXX-XXXX" \
  -d '{"path": "./src"}'
```

---

## Endpoints

### POST `/api/scan`

Scan a codebase for untested code.

**Request:**

```json
{
  "path": "./src",
  "include": ["**/*.ts"],
  "exclude": ["**/*.test.ts"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Directory to scan |
| `include` | string[] | No | Include patterns |
| `exclude` | string[] | No | Exclude patterns |

**Response:**

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "path": "src/utils/parser.ts",
        "exports": [
          {
            "name": "parseConfig",
            "type": "function",
            "lines": 12,
            "hasTest": false
          },
          {
            "name": "validateSchema",
            "type": "function",
            "lines": 28,
            "hasTest": false
          }
        ]
      }
    ],
    "summary": {
      "totalFiles": 15,
      "totalExports": 42,
      "untestedExports": 38
    }
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3847/api/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "./src"}'
```

---

### POST `/api/generate`

Generate tests for untested code.

**Request:**

```json
{
  "path": "./src",
  "framework": "vitest",
  "model": "gpt-4o",
  "limit": 10,
  "dryRun": false,
  "healing": true,
  "maxRetries": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Directory to process |
| `framework` | string | No | `vitest`, `jest`, `pytest` |
| `model` | string | No | OpenAI model (default: `gpt-4o`) |
| `limit` | number | No | Max files to process |
| `dryRun` | boolean | No | Preview without writing |
| `healing` | boolean | No | Enable self-healing (default: `true`) |
| `maxRetries` | number | No | Max healing attempts (default: `3`) |

**Response:**

```json
{
  "success": true,
  "data": {
    "generated": [
      {
        "source": "src/utils/parser.ts",
        "test": "src/utils/parser.test.ts",
        "exports": ["parseConfig", "validateSchema"],
        "testsCreated": 5,
        "attempts": 2,
        "healed": true
      }
    ],
    "summary": {
      "filesProcessed": 15,
      "testsGenerated": 42,
      "healingAttempts": 8,
      "healingSuccess": 8,
      "duration": "2m 34s"
    }
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3847/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "path": "./src",
    "framework": "vitest",
    "limit": 5
  }'
```

---

### POST `/api/run`

Run tests and get coverage report.

**Request:**

```json
{
  "path": "./src",
  "coverage": true,
  "filter": "auth",
  "framework": "vitest"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Test directory |
| `coverage` | boolean | No | Include coverage report |
| `filter` | string | No | Filter tests by name |
| `framework` | string | No | Test framework |

**Response:**

```json
{
  "success": true,
  "data": {
    "passed": 42,
    "failed": 0,
    "skipped": 2,
    "duration": "1.24s",
    "coverage": {
      "statements": 78.5,
      "branches": 72.3,
      "functions": 85.0,
      "lines": 78.5,
      "files": [
        {
          "path": "src/utils/parser.ts",
          "statements": 95.0,
          "branches": 90.0,
          "functions": 100.0,
          "lines": 95.0
        }
      ]
    }
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3847/api/run \
  -H "Content-Type: application/json" \
  -d '{"path": "./src", "coverage": true}'
```

---

### POST `/api/generate-inline`

Generate tests from inline code content (without files).

**Request:**

```json
{
  "filename": "math.ts",
  "content": "export function add(a: number, b: number): number {\n  return a + b;\n}",
  "framework": "vitest",
  "model": "gpt-4o"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | Yes | Virtual filename (for context) |
| `content` | string | Yes | Source code content |
| `framework` | string | No | Test framework |
| `model` | string | No | OpenAI model |

**Response:**

```json
{
  "success": true,
  "data": {
    "testContent": "import { describe, it, expect } from 'vitest';\nimport { add } from './math';\n\ndescribe('add', () => {\n  it('should add two numbers', () => {\n    expect(add(2, 3)).toBe(5);\n  });\n});\n",
    "testsCreated": 3,
    "model": "gpt-4o"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3847/api/generate-inline \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "math.ts",
    "content": "export function add(a, b) { return a + b; }",
    "framework": "vitest"
  }'
```

---

### GET `/api/health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": "2h 15m"
}
```

---

### GET `/api/billing/status`

Check billing configuration status.

**Response:**

```json
{
  "configured": true,
  "features": {
    "checkout": true,
    "webhooks": true,
    "licenseValidation": true
  }
}
```

---

### POST `/api/billing/checkout`

Create a Stripe checkout session for team subscription.

**Request:**

```json
{
  "email": "team@company.com",
  "teamName": "Acme Corp",
  "seats": 10
}
```

**Response:**

```json
{
  "success": true,
  "url": "https://checkout.stripe.com/c/pay/cs_..."
}
```

---

### GET `/api/billing/license/:key`

Validate a license key.

**Response:**

```json
{
  "valid": true,
  "license": {
    "teamName": "Acme Corp",
    "plan": "team",
    "seats": 10,
    "expiresAt": "2025-01-28T00:00:00Z",
    "features": ["healing", "ci-integration", "priority-support"]
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PATH",
    "message": "The specified path does not exist",
    "details": {
      "path": "./nonexistent"
    }
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PATH` | 400 | Path doesn't exist |
| `INVALID_FRAMEWORK` | 400 | Unknown framework |
| `MISSING_API_KEY` | 401 | OpenAI API key not set |
| `INVALID_API_KEY` | 401 | OpenAI API key invalid |
| `RATE_LIMITED` | 429 | OpenAI rate limit hit |
| `GENERATION_FAILED` | 500 | Test generation failed |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

## Webhooks

### POST `/api/billing/webhook`

Stripe webhook endpoint for billing events.

**Supported Events:**

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Configure in Stripe Dashboard → Developers → Webhooks.

---

## Rate Limits

The open-source version has no built-in rate limits.

For team deployments:
- **Scan:** 100 requests/minute
- **Generate:** 20 requests/minute
- **Run:** 50 requests/minute

Rate limit headers:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1706425200
```

---

## SDKs

### JavaScript/TypeScript

```typescript
import { AgentQA } from 'agentqa';

const client = new AgentQA({
  baseUrl: 'http://localhost:3847',
  licenseKey: 'AQAT-XXXX-XXXX-XXXX-XXXX'  // optional
});

// Scan
const scan = await client.scan('./src');
console.log(scan.summary);

// Generate
const result = await client.generate('./src', {
  framework: 'vitest',
  limit: 10
});

// Run
const coverage = await client.run('./src', { coverage: true });
```

### Python

```python
from agentqa import AgentQA

client = AgentQA(
    base_url="http://localhost:3847",
    license_key="AQAT-XXXX-XXXX-XXXX-XXXX"  # optional
)

# Scan
scan = client.scan("./src")
print(scan["summary"])

# Generate
result = client.generate("./src", framework="pytest")

# Run
coverage = client.run("./src", coverage=True)
```

---

## OpenAPI Spec

Full OpenAPI 3.0 specification available at:

```
GET /api/openapi.json
GET /api/openapi.yaml
```

Interactive docs (when enabled):

```
GET /api/docs
```
