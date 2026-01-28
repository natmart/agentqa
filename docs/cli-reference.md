# CLI Reference

Complete reference for all AgentQA CLI commands.

## Global Options

These options work with all commands:

```bash
agentqa [command] [options]

Options:
  -V, --version         Output version number
  -h, --help            Display help for command
  --config <path>       Path to config file (default: .agentqa.yml)
  --verbose             Enable verbose logging
  --json                Output results as JSON
```

---

## Commands

### `scan`

Scan a codebase for untested code.

```bash
agentqa scan <path> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `path` | Directory to scan (default: `./src`) |

**Options:**

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
| `--include <patterns>` | Include glob patterns (comma-separated) |
| `--exclude <patterns>` | Exclude glob patterns (comma-separated) |

**Examples:**

```bash
# Basic scan
agentqa scan ./src

# Scan with JSON output
agentqa scan ./src --json

# Custom include/exclude
agentqa scan ./src --include "**/*.ts" --exclude "**/generated/**"

# Scan multiple directories
agentqa scan ./src ./lib
```

**Output:**

```
🔍 Scanning ./src for untested code...

Found 15 files with testable exports:

  src/utils/parser.ts
    ├─ parseConfig (function) - 12 lines
    ├─ validateSchema (function) - 28 lines
    └─ mergeDefaults (function) - 8 lines

  src/services/auth.ts
    ├─ AuthService (class) - 145 lines
    │   ├─ login (method)
    │   ├─ logout (method)
    │   └─ refresh (method)
    ├─ createToken (function) - 15 lines
    └─ verifyToken (function) - 22 lines

📊 Summary: 42 untested exports across 15 files
```

---

### `generate`

Generate AI-powered tests for untested code.

```bash
agentqa generate <path> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `path` | Directory to generate tests for |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--framework <name>` | Test framework | auto-detect |
| `--model <name>` | OpenAI model | `gpt-4o` |
| `--limit <n>` | Max files to process | unlimited |
| `--dry-run` | Preview without writing | `false` |
| `--no-healing` | Disable self-healing | `false` |

**Examples:**

```bash
# Generate with auto-detect framework
agentqa generate ./src

# Specify framework
agentqa generate ./src --framework vitest

# Limit to 5 files
agentqa generate ./src --limit 5

# Dry run (preview only)
agentqa generate ./src --dry-run

# Use specific model
agentqa generate ./src --model gpt-4-turbo
```

**Output:**

```
🤖 Generating tests with AI...

Using framework: vitest
Using model: gpt-4o

[1/15] src/utils/parser.ts
       Analyzing exports...
       Generating tests for 3 functions...
       → Created: parser.test.ts (5 tests)

[2/15] src/services/auth.ts
       Analyzing exports...
       Generating tests for AuthService class...
       → Created: auth.test.ts (8 tests)

...

✅ Complete!
   Files processed: 15
   Tests generated: 42
   Time elapsed: 2m 34s
```

---

### `heal`

Generate tests with automatic healing (retry on failure).

```bash
agentqa heal <path> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `path` | Directory to process |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--framework <name>` | Test framework | auto-detect |
| `--max-retries <n>` | Max healing attempts | `3` |
| `--model <name>` | OpenAI model | `gpt-4o` |
| `--limit <n>` | Max files to process | unlimited |

**Examples:**

```bash
# Basic healing
agentqa heal ./src --framework vitest

# More retries
agentqa heal ./src --max-retries 5

# Limit files
agentqa heal ./src --limit 10
```

**Output:**

```
🔧 Generating and healing tests...

[1/3] src/utils/parser.ts
────────────────────────────────────
Attempt 1: ❌ FAILED
  Error: Cannot find module './config'
  Analyzing error...
  
Attempt 2: ❌ FAILED  
  Error: Expected 3 arguments, got 2
  Analyzing error...

Attempt 3: ✅ SUCCESS
  Fixed: Corrected function signature

✅ SUCCESS after 3 attempt(s)
   Created: parser.test.ts
   Tests: 5 passed

[2/3] src/services/auth.ts
────────────────────────────────────
Attempt 1: ✅ SUCCESS

✅ SUCCESS after 1 attempt(s)
   Created: auth.test.ts
   Tests: 8 passed

Summary:
  ✅ Healed: 3/3 files
  📊 Tests: 42 total
  💪 Healing success rate: 100%
```

---

### `run`

Run tests and get coverage report.

```bash
agentqa run <path> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `path` | Test directory |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--coverage` | Include coverage report | `false` |
| `--filter <pattern>` | Filter tests by name | none |
| `--framework <name>` | Test framework | auto-detect |

**Examples:**

```bash
# Run all tests
agentqa run ./src

# With coverage
agentqa run ./src --coverage

# Filter tests
agentqa run ./src --filter "auth"

# Specific framework
agentqa run ./src --framework jest
```

**Output:**

```
▶️ Running tests...

 ✓ src/utils/parser.test.ts (5 tests) 234ms
 ✓ src/services/auth.test.ts (8 tests) 567ms
 ✓ src/utils/string.test.ts (3 tests) 123ms

Test Files  3 passed (3)
Tests      16 passed (16)
Duration   1.24s

Coverage:
──────────────────────────────────
File                  | % Stmts | % Branch | % Funcs | % Lines
──────────────────────────────────
All files             |   78.5  |    72.3  |   85.0  |   78.5
 src/utils/parser.ts  |   95.0  |    90.0  |  100.0  |   95.0
 src/services/auth.ts |   82.0  |    75.0  |   90.0  |   82.0
 src/utils/string.ts  |   65.0  |    55.0  |   70.0  |   65.0
──────────────────────────────────
```

---

### `gen-file`

Generate tests for a single file.

```bash
agentqa gen-file <file> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `file` | Source file to generate tests for |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--framework <name>` | Test framework | auto-detect |
| `--output <path>` | Output file path | auto |
| `--model <name>` | OpenAI model | `gpt-4o` |

**Examples:**

```bash
# Generate for single file
agentqa gen-file ./src/utils/math.ts --framework vitest

# Custom output path
agentqa gen-file ./src/auth.ts --output ./tests/auth.test.ts
```

---

### `serve`

Start the REST API server.

```bash
agentqa serve [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--port <n>` | Server port | `3847` |
| `--host <addr>` | Host address | `localhost` |

**Examples:**

```bash
# Start on default port
agentqa serve

# Custom port
agentqa serve --port 8080

# Listen on all interfaces
agentqa serve --host 0.0.0.0
```

**Output:**

```
🚀 AgentQA API server running

  Local:    http://localhost:3847
  Network:  http://192.168.1.100:3847

Endpoints:
  POST /api/scan           Scan codebase
  POST /api/generate       Generate tests
  POST /api/run            Run tests
  POST /api/generate-inline Generate from code string
  
Press Ctrl+C to stop
```

---

### `validate`

Validate configuration file.

```bash
agentqa validate [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--config <path>` | Config file to validate |

**Example:**

```bash
agentqa validate

# Output:
✅ Configuration valid

Settings:
  Path: ./src
  Framework: vitest
  Model: gpt-4o
  Max Retries: 3
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Test failures (after healing attempts) |
| `2` | Coverage below threshold |
| `3` | Configuration error |
| `4` | API key missing or invalid |
| `5` | Network/API error |

---

## Shell Completion

Enable tab completion for your shell:

**Bash:**
```bash
agentqa completion bash >> ~/.bashrc
```

**Zsh:**
```bash
agentqa completion zsh >> ~/.zshrc
```

**Fish:**
```bash
agentqa completion fish > ~/.config/fish/completions/agentqa.fish
```

---

## Examples

### Full Workflow

```bash
# 1. Check what needs tests
agentqa scan ./src

# 2. Generate tests with healing
agentqa heal ./src --framework vitest --max-retries 3

# 3. Run and verify
agentqa run ./src --coverage
```

### CI Pipeline

```bash
# Strict mode for CI
agentqa heal ./src \
  --framework vitest \
  --max-retries 5 \
  --model gpt-4o

# Check coverage meets threshold
agentqa run ./src --coverage || exit 2
```

### JSON Output for Tooling

```bash
# Machine-readable scan
agentqa scan ./src --json > scan-results.json

# Parse with jq
agentqa scan ./src --json | jq '.files | length'
```
