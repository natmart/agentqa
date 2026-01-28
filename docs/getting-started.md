# Getting Started

Get AgentQA up and running in under 5 minutes.

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn**
- **OpenAI API key** (for AI test generation)

## Installation

### Global Install (Recommended)

```bash
npm install -g agentqa
```

This gives you the `agentqa` command globally.

### Project Install

```bash
npm install --save-dev agentqa
```

Then use with npx:

```bash
npx agentqa scan ./src
```

### Verify Installation

```bash
agentqa --version
# agentqa v1.0.0
```

---

## Quick Start

### Step 1: Set Your API Key

AgentQA uses OpenAI's GPT-4 to generate tests. Set your API key:

```bash
export OPENAI_API_KEY=sk-your-api-key-here
```

Or create a `.env` file in your project:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### Step 2: Scan Your Codebase

Find untested code in your project:

```bash
agentqa scan ./src
```

**Sample output:**

```
🔍 Scanning ./src for untested code...

Found 15 files with testable exports:

  src/utils/parser.ts
    ├─ parseConfig (function)
    ├─ validateSchema (function)
    └─ mergeDefaults (function)

  src/services/auth.ts
    ├─ AuthService (class)
    ├─ createToken (function)
    └─ verifyToken (function)

  ... 13 more files

📊 Summary: 42 untested exports across 15 files
```

### Step 3: Generate Tests

Generate AI-powered tests for your code:

```bash
agentqa generate ./src --framework vitest
```

**Sample output:**

```
🤖 Generating tests with AI...

[1/15] src/utils/parser.ts
       → Created: parser.test.ts (5 tests)

[2/15] src/services/auth.ts
       → Created: auth.test.ts (8 tests)

...

✅ Generated 42 tests across 15 files
```

### Step 4: Run Tests

Execute the generated tests:

```bash
agentqa run ./src --coverage
```

---

## Your First Scan

Let's walk through a complete example.

### Example Project Structure

```
my-app/
├── src/
│   ├── utils/
│   │   ├── math.ts
│   │   └── string.ts
│   └── services/
│       └── user.ts
├── package.json
└── vitest.config.ts
```

### Sample Code (`src/utils/math.ts`)

```typescript
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
```

### Running AgentQA

```bash
# 1. Scan for untested code
agentqa scan ./src

# 2. Generate tests
agentqa generate ./src --framework vitest

# 3. Run with healing (auto-fix failures)
agentqa heal ./src --framework vitest
```

### Generated Test (`src/utils/math.test.ts`)

AgentQA generates comprehensive tests:

```typescript
import { describe, it, expect } from 'vitest';
import { add, multiply, divide } from './math';

describe('add', () => {
  it('should add two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });

  it('should handle zero', () => {
    expect(add(0, 5)).toBe(5);
  });
});

describe('divide', () => {
  it('should divide two numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should throw on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});
```

---

## Self-Healing Tests

AgentQA's killer feature: **automatic test healing**.

When a generated test fails, AgentQA:
1. Captures the error message
2. Analyzes what went wrong
3. Regenerates the test with fixes
4. Repeats until the test passes (up to N retries)

```bash
agentqa heal ./src --framework vitest --max-retries 3
```

**Output:**

```
🔧 Healing tests...

[1/3] src/utils/parser.ts
────────────────────────────────────
Attempt 1: ❌ FAILED
  Error: Cannot find module './config'
  
Attempt 2: ✅ SUCCESS
  Fixed: Added missing import mock

✅ SUCCESS after 2 attempt(s)
   Created: parser.test.ts
   Tests: 5 passed
```

---

## What's Next?

- **[Configuration](configuration.md)** — Customize AgentQA for your project
- **[CLI Reference](cli-reference.md)** — All available commands
- **[CI/CD Integration](ci-cd.md)** — Set up automated test generation

---

## Common First-Time Issues

| Issue | Solution |
|-------|----------|
| "OPENAI_API_KEY not set" | Export your API key: `export OPENAI_API_KEY=sk-...` |
| "No testable exports found" | Ensure your code exports functions/classes |
| "Framework not detected" | Use `--framework` flag explicitly |
| Tests fail repeatedly | Increase `--max-retries` or check imports |

See [Troubleshooting](troubleshooting.md) for more solutions.
