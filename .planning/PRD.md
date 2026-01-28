# Product Requirements Document: AgentQA

## Overview
- **Product**: AgentQA
- **One-liner**: Autonomous QA engineer for your CI/CD pipeline
- **Target User**: Development teams (5-50 devs) shipping fast without dedicated QA
- **Problem**: Developers hate writing tests, leading to brittle codebases and production bugs
- **Solution**: AI agent that autonomously generates, runs, and self-heals tests in CI/CD pipelines

## Success Metrics
- **Primary KPI**: Weekly Active Teams > 50 (teams running AgentQA in CI/CD weekly)
- **Secondary KPIs**:
  - Test coverage improvement: +20% average per project
  - Self-healing success rate: >80% of failed tests auto-fixed
  - Time to passing tests: <5 minutes per commit
  - Retention: >70% teams active after 30 days
  - NPS: >40 (promoters - detractors)

## Value Proposition

**Positioning**: "Your Autonomous QA Engineer"
- Not another Copilot assistant that requires hand-holding
- Not a test generation tool that dumps unmaintained tests
- A self-sufficient agent that owns the testing loop end-to-end

**Core Promise**: Tests that run, pass, and stay passing - without developer intervention

## User Stories

### P0 (Must Have for MVP)

**As a tech lead**, I want to install AgentQA in our CI/CD pipeline so that every commit gets automatically tested without burdening my team.

**As a developer**, I want tests to auto-heal when they break due to code changes so that I don't spend hours fixing flaky tests.

**As a developer**, I want AgentQA to identify untested code paths so that we can improve coverage on critical business logic.

**As a team**, we want test results posted to our PR comments so that we can see test status without leaving GitHub.

**As a tech lead**, I want to configure which files/directories AgentQA should test so that we can focus on high-value areas first.

### P1 (Should Have - Post-MVP)

**As a developer**, I want to see which tests cover which code paths so that I understand our test coverage depth.

**As a team**, we want AgentQA to prioritize testing based on code change frequency so that we test volatile areas more thoroughly.

**As a tech lead**, I want to approve AI-generated tests before they're committed so that we maintain code quality standards.

**As a developer**, I want AgentQA to suggest edge cases I haven't considered so that our tests are more comprehensive.

### P2 (Nice to Have - Future)

**As a team**, we want AgentQA to learn from production errors and generate regression tests automatically.

**As a developer**, I want natural language test requests like "test the payment flow with expired cards".

**As a tech lead**, I want analytics on which parts of the codebase have the weakest tests.

## Feature Specifications

### Feature 1: CI/CD Pipeline Integration

**Description**: AgentQA runs as a step in GitHub Actions, GitLab CI, or Jenkins pipelines.

**User Flow**:
1. Developer commits code and opens PR
2. CI pipeline triggers AgentQA step
3. AgentQA scans changed files for test gaps
4. AgentQA generates/updates tests
5. AgentQA runs tests in self-healing loop
6. Results posted as PR comment with coverage diff

**Acceptance Criteria**:
- ✓ GitHub Actions workflow template provided
- ✓ GitLab CI and Jenkins examples documented
- ✓ Exit code 0 if tests pass, 1 if fail after healing attempts
- ✓ PR comment shows: coverage %, tests added, tests healed, time taken
- ✓ Respects existing test framework (Jest, pytest, JUnit, etc.)

**Technical Notes**:
- Must detect test framework from package.json/requirements.txt
- Run in Docker container for isolation
- Support monorepo path filtering

### Feature 2: Self-Healing Test Loop

**Description**: When tests fail, AgentQA analyzes the failure, fixes the test or code, and re-runs until passing or max attempts reached.

**User Flow**:
1. Generated test fails on first run
2. AgentQA reads error message and stack trace
3. AgentQA determines if failure is due to:
   - Incorrect test assumptions
   - Missing setup/teardown
   - Flaky async timing
   - Actual code bug
4. AgentQA updates test or flags code issue
5. Re-run test (max 3 healing attempts)
6. Report outcome in PR comment

**Acceptance Criteria**:
- ✓ Healing loop runs max 3 times per test
- ✓ 80% of test failures auto-resolve
- ✓ Clear logging of each healing attempt
- ✓ Flag unresolvable failures with context for developer
- ✓ Never modify production code without explicit permission

**Technical Notes**:
- Use LLM to analyze error context
- Maintain healing history to avoid loops
- Timeout per healing attempt: 60s

### Feature 3: Smart Test Generation

**Description**: AgentQA scans code to identify untested paths and generates meaningful tests.

**User Flow**:
1. AgentQA scans target files/directories
2. Identifies functions, classes, API endpoints
3. Checks existing test coverage
4. Generates tests for uncovered code paths
5. Prioritizes by complexity and criticality
6. Saves tests in conventional locations

**Acceptance Criteria**:
- ✓ Respects existing test file naming conventions
- ✓ Generates tests in same framework as existing tests
- ✓ Includes edge cases (null, empty, boundary values)
- ✓ Tests are runnable without modification
- ✓ Minimum 70% of generated tests pass on first run

**Technical Notes**:
- Use AST parsing for code analysis
- Follow project's test file structure (e.g., `__tests__/`, `test_*.py`)
- Generate idiomatic tests for each language

### Feature 4: Configuration & Control

**Description**: Simple config file to control AgentQA behavior.

**User Flow**:
1. Developer creates `.agentqa.yml` in repo root
2. Specifies paths to test, ignore patterns, test framework
3. Sets healing attempts, coverage targets, verbosity
4. Commits config to version control

**Acceptance Criteria**:
- ✓ YAML config with sensible defaults
- ✓ Path includes/excludes support glob patterns
- ✓ Override test command if non-standard
- ✓ Set coverage increase threshold (e.g., "don't drop below current")
- ✓ Dry-run mode for validation

**Configuration Options**:
```yaml
agentqa:
  include:
    - "src/**/*.ts"
    - "lib/**/*.py"
  exclude:
    - "**/*.test.*"
    - "**/*.spec.*"
    - "**/vendor/**"
  test_framework: "auto"  # or jest, pytest, junit
  test_command: "npm test"  # override if needed
  healing:
    enabled: true
    max_attempts: 3
    timeout: 60
  coverage:
    target: 80  # target coverage %
    enforce_increase: true  # fail if coverage drops
  output:
    pr_comments: true
    verbose: false
```

### Feature 5: Coverage Reporting & Diff

**Description**: Show coverage before/after AgentQA run with clear diffs.

**User Flow**:
1. AgentQA measures baseline coverage
2. Generates/heals tests
3. Measures new coverage
4. Posts diff to PR comment: "+5.2% coverage (73.1% → 78.3%)"
5. Highlights newly covered files/functions

**Acceptance Criteria**:
- ✓ Coverage % accurate for JS, Python, Java, Go
- ✓ Diff shows file-level and overall changes
- ✓ Fails CI if coverage drops below threshold
- ✓ Links to detailed coverage report

**Technical Notes**:
- Integrate with coverage.py, Istanbul/nyc, JaCoCo
- Store baseline in cache for comparison

## Non-Functional Requirements

### Performance
- Test generation: <2 minutes for 1000 LOC
- Healing loop: <5 minutes total per commit
- Pipeline overhead: <10% of total CI time

### Security
- No code sent to external servers without explicit opt-in
- Support self-hosted LLM endpoints
- API keys encrypted at rest
- Audit log of all code modifications

### Scalability
- Handle monorepos up to 100k LOC
- Support up to 50 parallel CI jobs per team
- Rate limiting for LLM API calls

### Reliability
- Graceful degradation if LLM API is down
- Never break existing tests
- Rollback mechanism if generated tests cause issues

### Compatibility
- Languages: JavaScript/TypeScript, Python (MVP); Java, Go (P1)
- CI Platforms: GitHub Actions, GitLab CI, Jenkins (MVP); CircleCI, Travis (P1)
- Test Frameworks: Jest, pytest, JUnit (MVP); Vitest, Mocha, pytest-bdd (P1)

## Out of Scope (v1)

- **IDE plugins**: CI/CD first, not local development
- **UI dashboard**: CLI and PR comments only for MVP
- **Custom test frameworks**: Only mainstream frameworks
- **Non-code testing**: No UI testing, API testing, load testing
- **Test maintenance**: No refactoring of existing tests (only healing when they fail)
- **Multi-language monorepos**: Single language per run in v1

## Pricing & Packaging

### Target Pricing
- **Team License**: $299/month (up to 10 seats)
- **Enterprise**: Custom pricing (50+ seats, self-hosted option)

### Free Tier (For Validation)
- 100 test generations per month
- 50 healing operations per month
- Public repos only
- Community support

### Paid Features
- Unlimited test generation & healing
- Private repo support
- Priority healing (faster LLM models)
- Advanced configuration (coverage enforcement, custom rules)
- Dedicated support channel

## Open Questions

1. **LLM Provider Strategy**: Default to OpenAI GPT-4? Offer Claude, local models?
   - **Decision needed by**: Week 1 (affects architecture)

2. **Test Approval Workflow**: Auto-commit generated tests or require PR review?
   - **Recommendation**: Auto-commit for MVP (faster validation), add approval in P1
   - **Decision needed by**: Week 2

3. **Healing Scope**: Should AgentQA ever modify production code to fix tests?
   - **Recommendation**: No for MVP (too risky), explore with explicit flags in P1
   - **Decision needed by**: Week 1

4. **Multi-language Support**: Launch with JS+Python or one language first?
   - **Recommendation**: JS/TypeScript only for MVP (largest market)
   - **Decision needed by**: Week 1

5. **Telemetry**: What usage data should we collect for product improvement?
   - **Must collect**: Tests generated, healing success rate, coverage deltas
   - **Nice to have**: Code patterns, error types, user feedback
   - **Decision needed by**: Week 3

## Success Criteria for MVP Launch

### Validation Metrics (First 90 Days)
- 20+ teams install AgentQA in their CI/CD
- 60%+ of teams remain active after 30 days
- 3+ testimonials on test quality improvement
- <5 critical bugs per 100 runs

### Product-Market Fit Signals
- Organic GitHub stars growth (>10/week)
- Inbound leads from word-of-mouth
- Users request enterprise features
- Competitors start copying positioning

### Go/No-Go Decision Point
- **Week 6**: If <10 active teams or <50% healing success rate → pivot or kill
- **Week 12**: If retention <40% → major product changes needed

## Appendix: Competitive Positioning

| Feature | AgentQA | CodiumAI | Diffblue | GitHub Copilot |
|---------|---------|----------|----------|----------------|
| **CI/CD Native** | ✓ Core focus | ✗ IDE-first | ✓ Enterprise | ✗ IDE only |
| **Self-Healing** | ✓ Automated loop | ✗ Manual fix | ~ Partial | ✗ None |
| **Autonomous** | ✓ Zero-touch | ✗ Assisted | ~ Semi-auto | ✗ Prompt-driven |
| **Price** | $299/mo team | $30/user | $2.5k/mo | $19/user |
| **Open Source** | ✓ Planned | ✗ Closed | ✗ Closed | ✗ Closed |

**Key Differentiator**: AgentQA is the only tool that runs autonomously in CI/CD with self-healing, positioning as a teammate, not a tool.
