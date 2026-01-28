# Technical Requirements: AgentQA

## Recommended Stack

### Core CLI
- **Language**: TypeScript/Node.js
- **Rationale**:
  - Cross-platform compatibility
  - Rich ecosystem for AST parsing (babel, typescript compiler API)
  - Easy integration with npm/yarn for JS projects
  - Existing CLI foundation in place

### Agent Framework
- **Framework**: LangChain or custom agent loop
- **Rationale**:
  - Need structured tool calling for scan → generate → run → heal cycle
  - LangChain provides observability and logging
  - Consider custom lightweight loop for better control

### LLM Integration
- **Primary**: OpenAI GPT-4o (fast, cost-effective)
- **Secondary**: Anthropic Claude 3.5 Sonnet (better code reasoning)
- **Self-hosted**: Ollama support for air-gapped environments
- **Rationale**:
  - Multiple providers for resilience
  - GPT-4o: $2.50/1M input tokens (fast, cheap)
  - Claude: Better at complex debugging logic
  - Ollama: Enterprise requirement for data privacy

### Test Execution
- **Approach**: Spawn child processes for test runners
- **Isolation**: Run tests in sandboxed environment (Docker optional)
- **Rationale**:
  - Respect existing project test commands
  - Prevent test pollution
  - Capture stdout/stderr for healing analysis

### Configuration
- **Format**: YAML (`.agentqa.yml`)
- **Parser**: js-yaml
- **Rationale**: Familiar to developers, easy to version control

### CI/CD Integration
- **Primary**: GitHub Actions (YAML workflow)
- **Secondary**: GitLab CI, Jenkins (Groovy/YAML)
- **Rationale**: GitHub has 90%+ market share in our target segment

## APIs & Integrations

### GitHub API
- **Purpose**: Post PR comments, check CI status, fetch diff
- **Auth**: GitHub App or PAT (Personal Access Token)
- **Rate Limits**: 5000 req/hour (sufficient for MVP)

### Coverage Tools
- **JavaScript**: Istanbul/nyc (built into Jest)
- **Python**: coverage.py
- **Integration**: Parse coverage reports (JSON/XML), calculate diffs

### LLM APIs
- **OpenAI**: REST API with streaming for UX
- **Anthropic**: REST API
- **Ollama**: Local HTTP API
- **Fallback**: Queue requests if rate limited

### Optional (P1)
- **Sentry/DataDog**: Error tracking for agent failures
- **PostHog**: Product analytics (healing success rates, usage)

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────┐
│              CI/CD Pipeline (GitHub Actions)        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                 AgentQA CLI                         │
│  ┌──────────────────────────────────────────────┐  │
│  │  1. Scan: Detect changed files & coverage   │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ▼                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  2. Generate: Create tests for gaps         │  │
│  │     • AST analysis → untested functions     │  │
│  │     • LLM → test code generation            │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ▼                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  3. Run: Execute tests, capture failures    │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ▼                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  4. Heal: Fix failing tests (loop)          │  │
│  │     • Analyze error + context               │  │
│  │     • LLM → patch test code                 │  │
│  │     • Re-run → repeat if still failing      │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ▼                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  5. Report: Post results to PR              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Scanner Module
- **Input**: File paths, git diff
- **Output**: List of functions/classes to test
- **Tech**:
  - TypeScript: `@typescript-eslint/parser`, `@babel/parser`
  - Python: `ast` module via Python child process
- **Responsibilities**:
  - Parse source code to AST
  - Identify exported functions, classes, methods
  - Map to existing tests (file naming conventions)
  - Rank by complexity (cyclomatic complexity)

#### 2. Generator Module
- **Input**: Untested code snippets + context
- **Output**: Test file content
- **Tech**: LLM API with structured prompts
- **Prompt Structure**:
  ```
  You are a QA engineer writing tests for:

  [CODE SNIPPET]

  Existing test examples:
  [SIMILAR TESTS FROM CODEBASE]

  Generate a test file that:
  - Uses [DETECTED FRAMEWORK]
  - Follows [PROJECT CONVENTIONS]
  - Tests edge cases: null, empty, boundaries
  - Is runnable without modification
  ```
- **Optimizations**:
  - Cache similar test patterns
  - Few-shot learning from existing tests
  - Stream responses for perceived speed

#### 3. Runner Module
- **Input**: Test file paths
- **Output**: Pass/fail + error details
- **Tech**: `child_process.spawn` with timeout
- **Responsibilities**:
  - Detect test command from config or package.json
  - Execute in isolated environment
  - Parse test output (TAP, JSON, JUnit XML)
  - Extract failure messages + stack traces

#### 4. Healer Module
- **Input**: Failed test + error context
- **Output**: Fixed test code
- **Tech**: LLM with debugging context
- **Prompt Structure**:
  ```
  This test failed:

  [TEST CODE]

  Error:
  [ERROR MESSAGE + STACK]

  Source code:
  [RELEVANT SOURCE]

  Likely issue: [CATEGORIZED ERROR TYPE]

  Fix the test to pass. Respond with ONLY the corrected test code.
  ```
- **Healing Categories**:
  - **Flaky async**: Add `await`, increase timeout
  - **Wrong assertion**: Update expected value
  - **Missing setup**: Add beforeEach/fixtures
  - **Breaking change**: Adapt to new API
- **Safety**:
  - Max 3 healing attempts
  - Never modify source code (only tests)
  - Log all healing attempts for debugging

#### 5. Reporter Module
- **Input**: Test results, coverage diff
- **Output**: PR comment, exit code
- **Tech**: GitHub API (Octokit)
- **Comment Format**:
  ```markdown
  ## AgentQA Results

  ✅ **Tests Passing**: 47/50 (+5 new tests)
  🔧 **Self-Healed**: 3 tests fixed automatically
  📊 **Coverage**: 78.3% (+5.2%) ↑

  ### Changes
  - ✅ `src/auth.ts`: Added 3 tests for login edge cases
  - 🔧 `src/payment.ts`: Healed async timeout in checkout test
  - ✅ `src/api.ts`: Added error handling tests

  <details>
  <summary>Healing Log</summary>

  **Test**: `payment.test.ts:45` - "should process refund"
  - Attempt 1: Timeout → Added await
  - Attempt 2: Passed ✓

  </details>

  [View full coverage report →](#)
  ```

## Data Model (High-Level)

### Configuration Schema
```typescript
interface AgentQAConfig {
  include: string[];           // Glob patterns for files to test
  exclude: string[];           // Glob patterns to ignore
  test_framework?: string;     // "auto" | "jest" | "pytest" | "junit"
  test_command?: string;       // Override test execution command
  healing: {
    enabled: boolean;
    max_attempts: number;      // Default: 3
    timeout: number;           // Seconds per attempt
  };
  coverage: {
    target?: number;           // Target coverage %
    enforce_increase: boolean; // Fail if coverage drops
  };
  llm: {
    provider: "openai" | "anthropic" | "ollama";
    model?: string;            // Override default model
    api_key?: string;          // Or use env var
    base_url?: string;         // For self-hosted
  };
  output: {
    pr_comments: boolean;
    verbose: boolean;
  };
}
```

### Test Metadata (Internal)
```typescript
interface TestRun {
  id: string;
  timestamp: Date;
  commit_sha: string;

  scan_results: {
    files_analyzed: number;
    untested_functions: string[];
    coverage_before: number;
  };

  generation: {
    tests_created: number;
    files_modified: string[];
    generation_time_ms: number;
  };

  execution: {
    tests_run: number;
    tests_passed: number;
    tests_failed: number;
    execution_time_ms: number;
  };

  healing: {
    attempts: HealingAttempt[];
    success_rate: number;
  };

  coverage_after: number;
}

interface HealingAttempt {
  test_file: string;
  test_name: string;
  attempt_number: number;
  error_type: string;
  fix_applied: string;
  success: boolean;
}
```

## Technical Constraints

### Performance
- **LLM latency**: Use streaming for generation, parallel requests where possible
- **Test execution**: Timeout after 5 minutes to prevent CI hangs
- **CI job time**: Total AgentQA step should be <10% of pipeline time

### Compatibility
- **Node.js**: v18+ (LTS)
- **Python**: 3.8+ (for Python test generation)
- **Git**: Required for diff analysis
- **Docker**: Optional but recommended for isolation

### Security
- **Code Exfiltration**: Never send full codebase to LLM, only relevant snippets
- **API Keys**: Support env vars, CI secrets, never log
- **Sandboxing**: Test execution in isolated environment (consider Docker)
- **Rate Limiting**: Respect LLM API limits, implement backoff

### Observability
- **Logging**: Structured logs (JSON) with correlation IDs
- **Metrics**: Track healing success rate, generation time, coverage delta
- **Errors**: Graceful degradation if LLM unavailable
- **Debugging**: `--verbose` flag for detailed output

## Technology Decisions

### Decision 1: TypeScript for CLI
- **Alternatives Considered**: Python, Go
- **Chosen**: TypeScript
- **Rationale**:
  - Target audience is JS/TS developers
  - Rich AST parsing ecosystem
  - Easier to distribute via npm
  - Existing CLI codebase

### Decision 2: OpenAI GPT-4o as Primary LLM
- **Alternatives Considered**: Claude 3.5, Gemini, local models
- **Chosen**: GPT-4o with Claude fallback
- **Rationale**:
  - GPT-4o: 2x faster, 50% cheaper than GPT-4 Turbo
  - Claude: Better reasoning for complex healing
  - Ollama: Enterprise requirement for air-gapped
- **Cost Model**: ~$0.10 per test generation (1K tokens in, 500 out)

### Decision 3: Child Process for Test Execution
- **Alternatives Considered**: VM, Docker, WASM sandbox
- **Chosen**: Child process with timeout
- **Rationale**:
  - Simplest, works everywhere
  - Respects project's test environment
  - Docker optional for paranoid security

### Decision 4: GitHub Actions First
- **Alternatives Considered**: Build all CI platforms simultaneously
- **Chosen**: GitHub Actions for MVP, then GitLab/Jenkins
- **Rationale**:
  - 90% of target users on GitHub
  - Fastest path to validation
  - Action Marketplace distribution

### Decision 5: YAML Configuration
- **Alternatives Considered**: JSON, TOML, JS config file
- **Chosen**: YAML
- **Rationale**:
  - Familiar to developers (CI configs)
  - Comments support for documentation
  - Less verbose than JSON

## Development Environment

### Required Tools
- Node.js 18+ with npm/yarn
- Git
- TypeScript compiler
- Optional: Docker for local testing

### Development Workflow
1. Local CLI testing: `npm run dev -- scan ./src`
2. Integration testing: GitHub Actions workflow in test repo
3. LLM mocking: Cached responses for fast iteration
4. E2E testing: Real repos with known coverage gaps

### Repository Structure
```
agentqa/
├── src/
│   ├── commands/        # CLI command handlers
│   ├── scanner/         # AST parsing, coverage analysis
│   ├── generator/       # LLM test generation
│   ├── runner/          # Test execution
│   ├── healer/          # Self-healing loop
│   ├── reporter/        # PR comments, output
│   └── utils/           # Config, logging, helpers
├── templates/
│   ├── github-action.yml
│   ├── gitlab-ci.yml
│   └── example.agentqa.yml
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/        # Sample codebases for testing
├── docs/
│   ├── getting-started.md
│   ├── configuration.md
│   └── self-hosting.md
└── package.json
```

## Open Technical Questions

1. **AST Parsing for Multiple Languages**: Build custom parsers or use Tree-sitter?
   - **Recommendation**: Language-specific parsers for MVP (TS API, Python ast), Tree-sitter for P1
   - **Decision needed by**: Week 2

2. **Test Deduplication**: How to avoid generating duplicate tests?
   - **Options**: Hash-based matching, semantic similarity (embeddings)
   - **Recommendation**: Start with file path conventions, add smart dedup in P1
   - **Decision needed by**: Week 3

3. **Healing Safety**: Should we ever modify source code?
   - **Recommendation**: NEVER in MVP, explore with explicit `--fix-code` flag in P1
   - **Decision needed by**: Week 1

4. **LLM Context Window**: How much code context to include?
   - **Current**: Function + imports + similar test examples (~1K tokens)
   - **Risk**: Miss global dependencies
   - **Mitigation**: Let users configure context scope
   - **Decision needed by**: Week 4

5. **Caching Strategy**: Cache generated tests, LLM responses?
   - **Recommendation**: Cache LLM responses keyed by code hash for 7 days
   - **Concern**: Stale responses if code changes
   - **Decision needed by**: Week 3

6. **Error Categorization**: How to classify test failures for healing?
   - **Options**: Rule-based (regex on errors), LLM-based classification
   - **Recommendation**: Hybrid - rules for common patterns, LLM for complex
   - **Decision needed by**: Week 2
