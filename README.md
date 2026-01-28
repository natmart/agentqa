# 🤖 AgentQA

**Autonomous QA Engineer for Dev Teams** - AI-powered testing that generates, runs, and auto-fixes tests until they pass.

> "80% test coverage without hiring a QA engineer" - $299/mo for your entire team

## 🔥 Key Feature: Self-Healing Tests

Unlike other AI test generators, AgentQA doesn't just write tests—it **runs them and automatically fixes errors**:

```bash
agentqa heal ./my-project --framework vitest

# [1/3] src/utils/parser.ts
# ────────────────────────────────────
# ✅ SUCCESS after 2 attempt(s)
#    Created: parser.test.ts
#    Tests: 5 passed
```

The self-healing loop:
1. Generate test with AI
2. Run it
3. If it fails, analyze error and regenerate
4. Repeat until passing (up to N retries)

## Features

- **🔄 Self-Healing** - Auto-fixes tests that don't compile or pass
- **🔍 Smart Scanning** - Finds untested functions, classes, and exports
- **🤖 AI Test Generation** - Uses GPT-4 to write comprehensive tests
- **📊 Coverage Reports** - Run tests and get instant coverage reports
- **🔌 CI Integration** - REST API for seamless pipeline integration
- **⚡ Multi-Framework** - Supports Jest, Vitest, and Pytest
- **🛡️ Test Quality Review** - Analyzes tests for anti-patterns and improvements
- **🌐 API Test Coverage** - Scans Express/Fastify routes and generates API tests
- **🚀 Easy Onboarding** - Interactive `init` and `doctor` commands for quick setup

## Installation

```bash
# Install globally
npm install -g agentqa

# Or use npx
npx agentqa scan ./src
```

## CLI Usage

### Scan for untested code

```bash
agentqa scan ./src

# Output as JSON
agentqa scan ./src --json
```

### Generate tests with AI

```bash
# Generate tests (requires OPENAI_API_KEY env var)
agentqa generate ./src --framework vitest

# Dry run - see what would be generated
agentqa generate ./src --dry-run

# Limit number of files
agentqa generate ./src --limit 10

# Use a specific model
agentqa generate ./src --model gpt-4
```

### Run tests and get coverage

```bash
agentqa run ./src

# Include coverage
agentqa run ./src --coverage

# Filter tests
agentqa run ./src --filter "auth"
```

### Generate tests for a single file

```bash
agentqa gen-file ./src/utils.ts --framework vitest
```

### Initialize AgentQA in a project

```bash
# Interactive setup wizard
agentqa init

# Non-interactive with defaults
agentqa init --yes
```

### Diagnose your setup

```bash
# Check environment and configuration
agentqa doctor
```

### Review test quality

```bash
# Analyze tests for anti-patterns and improvements
agentqa review ./src --framework vitest

# Output as JSON
agentqa review ./src --json
```

### Scan and test API routes

```bash
# Scan Express/Fastify routes
agentqa api-scan ./src

# Generate API tests for discovered endpoints
agentqa api-test ./src --framework vitest
```

## REST API

Start the API server:

```bash
npm start
# Or
agentqa serve
```

### Endpoints

#### POST /api/scan
Scan a codebase and get test suggestions.

```bash
curl -X POST http://localhost:3847/api/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "./src"}'
```

#### POST /api/generate
Generate tests for files without coverage.

```bash
curl -X POST http://localhost:3847/api/generate \
  -H "Content-Type: application/json" \
  -d '{"path": "./src", "framework": "vitest", "limit": 5}'
```

#### POST /api/run
Run tests and get coverage report.

```bash
curl -X POST http://localhost:3847/api/run \
  -H "Content-Type: application/json" \
  -d '{"path": "./src", "coverage": true}'
```

#### POST /api/generate-inline
Generate tests from inline code content.

```bash
curl -X POST http://localhost:3847/api/generate-inline \
  -H "Content-Type: application/json" \
  -d '{"filename": "math.ts", "content": "export function add(a, b) { return a + b; }", "framework": "vitest"}'
```

## CI/CD Integration

### GitHub Actions

AgentQA provides a GitHub Action for seamless CI/CD integration. It runs the full pipeline (scan → generate → run → heal) and posts results as PR comments.

#### Quick Start (5 minutes)

1. Add your OpenAI API key to repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add `OPENAI_API_KEY` with your API key

2. Create `.github/workflows/agentqa.yml`:

```yaml
name: AgentQA

on:
  pull_request:
    branches: [main]

jobs:
  generate-tests:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - uses: agentqa/agentqa@v1
        with:
          path: './src'
          framework: 'vitest'
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

That's it! AgentQA will now:
- 🔍 Scan your code for untested functions
- 🤖 Generate tests using AI
- ▶️ Run the tests
- 🔧 Auto-fix any failing tests
- 💬 Post a coverage report as a PR comment
- ✅ Commit the passing tests

#### Full Configuration

```yaml
name: AgentQA - Full Pipeline

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'lib/**'
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  agentqa:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - run: npm ci
      
      - name: Run AgentQA
        uses: agentqa/agentqa@v1
        with:
          # Path to scan (default: ./src)
          path: './src'
          
          # Test framework: jest, vitest, pytest
          framework: 'vitest'
          
          # OpenAI API key (required)
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          
          # GitHub token for PR comments (optional, defaults to GITHUB_TOKEN)
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
          # Max healing retries per test (1-5, default: 3)
          max-retries: 3
          
          # OpenAI model (default: gpt-4o)
          model: 'gpt-4o'
          
          # Preview mode - no file changes (default: false)
          dry-run: false
          
          # Auto-commit generated tests (default: true)
          auto-commit: true
          
          # Post results as PR comment (default: true)
          post-comment: true
          
          # Fail if coverage drops below threshold
          coverage-threshold: 70
          
          # Max files to process per run
          limit: 20
          
          # Enable verbose logging
          verbose: false
```

#### Using as Reusable Workflow

You can also use AgentQA as a reusable workflow:

```yaml
name: Tests

on:
  pull_request:
    branches: [main]

jobs:
  agentqa:
    uses: agentqa/agentqa/.github/workflows/agentqa.yml@main
    with:
      path: './src'
      framework: 'vitest'
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

#### Action Outputs

The action provides these outputs for use in subsequent steps:

| Output | Description |
|--------|-------------|
| `coverage-before` | Coverage % before test generation |
| `coverage-after` | Coverage % after generation & healing |
| `coverage-diff` | Coverage improvement (+X%) |
| `tests-generated` | Number of tests created |
| `tests-healed` | Number of tests that needed healing |
| `healing-success-rate` | % of failed tests successfully healed |

Example using outputs:

```yaml
- name: Run AgentQA
  id: qa
  uses: agentqa/agentqa@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}

- name: Check results
  run: |
    echo "Coverage improved by ${{ steps.qa.outputs.coverage-diff }}%"
    echo "Generated ${{ steps.qa.outputs.tests-generated }} tests"
```

#### PR Comment Preview

AgentQA posts a detailed report on each PR:

```
## 🤖 AgentQA Report

✅ **Coverage 📈 65% → 78%** (+13%)

| Metric | Value |
|--------|-------|
| 📝 Tests Generated | 12 |
| 🔧 Tests Healed | 3 |
| 💪 Healing Success Rate | 100% |
```

#### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - all tests pass |
| 1 | Test failures after max healing attempts |
| 2 | Coverage below threshold |
| 3 | Configuration error |

#### Troubleshooting

**"API key not found"**
- Ensure `OPENAI_API_KEY` is set in repository secrets
- Check the secret name matches exactly

**"Permission denied" on commit**
- Add `permissions: contents: write` to your job
- For forks, auto-commit is disabled by default

**"Tests keep failing"**
- Increase `max-retries` to 5
- Check if your code has complex dependencies
- Review the generated tests for edge cases

**Rate limits**
- Use `limit: 10` to process fewer files per run
- Consider running on push to main only (not every PR)

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for AI test generation
- `OPENAI_BASE_URL` - Custom OpenAI-compatible API endpoint
- `PORT` - Server port (default: 3847)

### Stripe Billing (Optional)

- `STRIPE_SECRET_KEY` - Stripe secret API key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `STRIPE_PRICE_ID` - Price ID for team license
- `LICENSE_SECRET` - Secret for signing license keys

## 💳 Stripe Billing Setup

AgentQA includes built-in Stripe billing for team license subscriptions ($299/mo).

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete account verification

### 2. Create Product & Price

1. Go to **Products** in Stripe Dashboard
2. Click **Add Product**
3. Set up:
   - Name: "AgentQA Team License"
   - Description: "AI-powered QA automation for your entire team"
   - Pricing: $299/month, recurring
4. Copy the **Price ID** (starts with `price_`)

### 3. Get API Keys

1. Go to **Developers > API Keys**
2. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

### 4. Configure Webhooks

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Set URL: `https://your-domain.com/api/billing/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

### 5. Set Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
STRIPE_PRICE_ID=price_your-price-id
LICENSE_SECRET=random-32-char-string
```

### Billing API Endpoints

#### Create Checkout Session
```bash
curl -X POST http://localhost:3847/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "email": "team@company.com",
    "teamName": "Acme Corp",
    "seats": 10
  }'
# Returns: { "success": true, "url": "https://checkout.stripe.com/..." }
```

#### Validate License Key
```bash
curl http://localhost:3847/api/billing/license/AQAT-XXXX-XXXX-XXXX-XXXX
# Returns: { "valid": true, "license": { "teamName": "...", "plan": "team", ... } }
```

#### Check Billing Status
```bash
curl http://localhost:3847/api/billing/status
# Returns: { "configured": true, "features": { ... } }
```

### Testing Locally

Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3847/api/billing/webhook

# Use the provided webhook secret for testing
```

### License Key Format

License keys follow the format: `AQAT-XXXX-XXXX-XXXX-XXXX`
- `AQAT` = AgentQA Team
- Each `XXXX` is a hex segment derived from subscription data

License keys are automatically:
- Generated on successful checkout
- Validated against subscription status
- Revoked when subscription is cancelled

## Supported Frameworks

| Framework | Language | Test Pattern |
|-----------|----------|--------------|
| Vitest | TypeScript/JavaScript | `*.test.ts`, `*.spec.ts` |
| Jest | TypeScript/JavaScript | `*.test.ts`, `*.spec.ts` |
| Pytest | Python | `test_*.py`, `*_test.py` |

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Run CLI
npm run cli -- scan ./src
```

## License

MIT
