# Configuration

Configure AgentQA using a `.agentqa.yml` file, environment variables, or CLI flags.

## Configuration File

Create `.agentqa.yml` in your project root:

```yaml
# .agentqa.yml - AgentQA Configuration

# Path to scan for source files
path: ./src

# Test framework: vitest, jest, pytest
framework: vitest

# OpenAI model for test generation
model: gpt-4o

# Maximum healing retries per test
maxRetries: 3

# Files/directories to exclude
exclude:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/node_modules/**"
  - "**/dist/**"
  - "**/__mocks__/**"

# Include patterns (default: all supported extensions)
include:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"

# Coverage settings
coverage:
  enabled: true
  threshold: 70
  reporters:
    - text
    - html
    - json

# AI generation settings
generation:
  # Test style: unit, integration, e2e
  style: unit
  
  # Include edge cases in generated tests
  edgeCases: true
  
  # Add JSDoc comments to tests
  comments: true
  
  # Mock external dependencies
  mockExternals: true

# CI/CD settings
ci:
  # Auto-commit generated tests
  autoCommit: true
  
  # Post PR comments
  postComment: true
  
  # Fail on coverage drop
  failOnCoverageDrop: true
```

---

## Configuration Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | string | `./src` | Source directory to scan |
| `framework` | string | auto-detect | Test framework: `vitest`, `jest`, `pytest` |
| `model` | string | `gpt-4o` | OpenAI model for generation |
| `maxRetries` | number | `3` | Max healing attempts per test |

### File Patterns

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | string[] | See below | Glob patterns to include |
| `exclude` | string[] | See below | Glob patterns to exclude |

**Default include patterns:**
```yaml
include:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
```

**Default exclude patterns:**
```yaml
exclude:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/test/**"
  - "**/tests/**"
  - "**/__tests__/**"
  - "**/node_modules/**"
  - "**/dist/**"
  - "**/build/**"
```

### Coverage Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `coverage.enabled` | boolean | `true` | Enable coverage reporting |
| `coverage.threshold` | number | `70` | Minimum coverage percentage |
| `coverage.reporters` | string[] | `["text"]` | Coverage report formats |

**Available reporters:** `text`, `html`, `json`, `lcov`, `cobertura`

### Generation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `generation.style` | string | `unit` | Test style: `unit`, `integration`, `e2e` |
| `generation.edgeCases` | boolean | `true` | Generate edge case tests |
| `generation.comments` | boolean | `true` | Add descriptive comments |
| `generation.mockExternals` | boolean | `true` | Auto-mock external deps |

### CI Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ci.autoCommit` | boolean | `true` | Commit generated tests |
| `ci.postComment` | boolean | `true` | Post PR comment with results |
| `ci.failOnCoverageDrop` | boolean | `true` | Fail if coverage decreases |

---

## Environment Variables

Environment variables override config file settings:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | **Required.** Your OpenAI API key |
| `OPENAI_BASE_URL` | Custom OpenAI-compatible endpoint |
| `AGENTQA_MODEL` | Override AI model |
| `AGENTQA_MAX_RETRIES` | Override max retries |
| `AGENTQA_FRAMEWORK` | Override test framework |
| `PORT` | API server port (default: 3847) |

### Example `.env` File

```env
# Required
OPENAI_API_KEY=sk-your-api-key-here

# Optional overrides
OPENAI_BASE_URL=https://api.openai.com/v1
AGENTQA_MODEL=gpt-4o
AGENTQA_MAX_RETRIES=5
PORT=3847
```

---

## Configuration Precedence

Settings are applied in this order (later overrides earlier):

1. **Defaults** — Built-in defaults
2. **Config file** — `.agentqa.yml`
3. **Environment variables** — `AGENTQA_*`
4. **CLI flags** — `--model`, `--max-retries`, etc.

**Example:**

```bash
# Config file says model: gpt-4o
# CLI flag overrides to gpt-4-turbo
agentqa generate ./src --model gpt-4-turbo
```

---

## Framework-Specific Configuration

### Vitest

```yaml
framework: vitest

# Vitest-specific options
vitest:
  config: ./vitest.config.ts
  testDir: ./tests
  globals: true
```

### Jest

```yaml
framework: jest

# Jest-specific options  
jest:
  config: ./jest.config.js
  testDir: ./__tests__
  setupFiles:
    - ./jest.setup.js
```

### Pytest

```yaml
framework: pytest

# Pytest-specific options
pytest:
  config: ./pytest.ini
  testDir: ./tests
  markers:
    - unit
    - integration
```

---

## Multiple Configurations

Use different configs for different scenarios:

```bash
# Development
agentqa scan ./src --config .agentqa.dev.yml

# CI/CD
agentqa generate ./src --config .agentqa.ci.yml
```

**`.agentqa.ci.yml`:**

```yaml
path: ./src
framework: vitest
maxRetries: 5
coverage:
  threshold: 80
ci:
  autoCommit: true
  postComment: true
```

---

## Validation

AgentQA validates your configuration on startup:

```bash
agentqa validate
```

**Output:**

```
✅ Configuration valid

Settings:
  Path: ./src
  Framework: vitest (detected)
  Model: gpt-4o
  Max Retries: 3
  Coverage Threshold: 70%

Environment:
  ✅ OPENAI_API_KEY: Set
  ⚠️ OPENAI_BASE_URL: Not set (using default)
```

---

## Example Configurations

### Minimal

```yaml
# .agentqa.yml
path: ./src
framework: vitest
```

### Monorepo

```yaml
# .agentqa.yml
path: ./packages
include:
  - "**/src/**/*.ts"
exclude:
  - "**/dist/**"
  - "**/node_modules/**"
framework: vitest
```

### Python Project

```yaml
# .agentqa.yml
path: ./src
include:
  - "**/*.py"
exclude:
  - "**/test_*.py"
  - "**/__pycache__/**"
framework: pytest
```

### Strict CI

```yaml
# .agentqa.yml
path: ./src
framework: vitest
maxRetries: 5
model: gpt-4o
coverage:
  threshold: 90
  failBelow: true
ci:
  autoCommit: false
  failOnCoverageDrop: true
generation:
  edgeCases: true
  mockExternals: true
```
