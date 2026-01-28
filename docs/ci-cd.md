# CI/CD Integration

Integrate AgentQA into your continuous integration pipeline to automatically generate and heal tests on every PR.

## GitHub Actions

AgentQA provides an official GitHub Action for seamless integration.

### Quick Start (5 Minutes)

**1. Add your OpenAI API key to secrets:**

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

- Name: `OPENAI_API_KEY`
- Value: Your OpenAI API key

**2. Create workflow file:**

`.github/workflows/agentqa.yml`:

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

That's it! AgentQA will now run on every PR.

### Full Configuration

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
          # Required
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          
          # Path to scan (default: ./src)
          path: './src'
          
          # Test framework: jest, vitest, pytest
          framework: 'vitest'
          
          # GitHub token for PR comments
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
          # Max healing retries (1-5)
          max-retries: 3
          
          # OpenAI model
          model: 'gpt-4o'
          
          # Preview mode - no file changes
          dry-run: false
          
          # Auto-commit generated tests
          auto-commit: true
          
          # Post results as PR comment
          post-comment: true
          
          # Fail if coverage below threshold
          coverage-threshold: 70
          
          # Max files per run
          limit: 20
          
          # Verbose logging
          verbose: false
```

### Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `openai-api-key` | Yes | — | OpenAI API key |
| `path` | No | `./src` | Source directory |
| `framework` | No | auto-detect | Test framework |
| `github-token` | No | `GITHUB_TOKEN` | For PR comments |
| `max-retries` | No | `3` | Healing attempts |
| `model` | No | `gpt-4o` | AI model |
| `dry-run` | No | `false` | Preview only |
| `auto-commit` | No | `true` | Commit tests |
| `post-comment` | No | `true` | PR comment |
| `coverage-threshold` | No | `70` | Min coverage % |
| `limit` | No | unlimited | Max files |

### Action Outputs

Use outputs in subsequent steps:

```yaml
- name: Run AgentQA
  id: qa
  uses: agentqa/agentqa@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}

- name: Check Results
  run: |
    echo "Coverage: ${{ steps.qa.outputs.coverage-before }} → ${{ steps.qa.outputs.coverage-after }}"
    echo "Improvement: ${{ steps.qa.outputs.coverage-diff }}%"
    echo "Tests generated: ${{ steps.qa.outputs.tests-generated }}"
```

| Output | Description |
|--------|-------------|
| `coverage-before` | Coverage % before |
| `coverage-after` | Coverage % after |
| `coverage-diff` | Improvement (+X%) |
| `tests-generated` | Number of tests |
| `tests-healed` | Tests that needed healing |
| `healing-success-rate` | Healing success % |

### PR Comment

AgentQA posts a detailed report:

```markdown
## 🤖 AgentQA Report

✅ **Coverage 📈 65% → 78%** (+13%)

| Metric | Value |
|--------|-------|
| 📝 Tests Generated | 12 |
| 🔧 Tests Healed | 3 |
| 💪 Healing Success Rate | 100% |
| ⏱️ Duration | 2m 34s |

<details>
<summary>Files Processed</summary>

- ✅ `src/utils/parser.ts` → 5 tests
- ✅ `src/services/auth.ts` → 8 tests (healed)
- ✅ `src/utils/string.ts` → 3 tests

</details>
```

---

## GitLab CI

### Basic Setup

`.gitlab-ci.yml`:

```yaml
stages:
  - test

agentqa:
  stage: test
  image: node:20
  
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
  
  before_script:
    - npm install -g agentqa
    - npm ci
  
  script:
    - agentqa heal ./src --framework vitest --max-retries 3
    - agentqa run ./src --coverage
  
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

### With Auto-Commit

```yaml
agentqa:
  stage: test
  image: node:20
  
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
  
  before_script:
    - npm install -g agentqa
    - npm ci
    - git config user.email "agentqa@ci.local"
    - git config user.name "AgentQA Bot"
  
  script:
    - agentqa heal ./src --framework vitest
    - |
      if [[ -n $(git status --porcelain) ]]; then
        git add "**/*.test.ts"
        git commit -m "test: add AI-generated tests [skip ci]"
        git push origin HEAD:$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME
      fi
    - agentqa run ./src --coverage
  
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

### GitLab Variables

Add in Settings → CI/CD → Variables:

| Variable | Protected | Masked |
|----------|-----------|--------|
| `OPENAI_API_KEY` | Yes | Yes |

---

## Jenkins

### Jenkinsfile

```groovy
pipeline {
    agent {
        docker {
            image 'node:20'
        }
    }
    
    environment {
        OPENAI_API_KEY = credentials('openai-api-key')
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g agentqa'
                sh 'npm ci'
            }
        }
        
        stage('Generate Tests') {
            steps {
                sh 'agentqa heal ./src --framework vitest --max-retries 3'
            }
        }
        
        stage('Run Tests') {
            steps {
                sh 'agentqa run ./src --coverage'
            }
            post {
                always {
                    junit 'test-results.xml'
                    publishCoverage adapters: [coberturaAdapter('coverage/cobertura-coverage.xml')]
                }
            }
        }
        
        stage('Commit Tests') {
            when {
                changeRequest()
            }
            steps {
                sh '''
                    git config user.email "agentqa@jenkins.local"
                    git config user.name "AgentQA Bot"
                    git add "**/*.test.ts" || true
                    git commit -m "test: add AI-generated tests" || true
                    git push origin HEAD:${CHANGE_BRANCH}
                '''
            }
        }
    }
}
```

### Jenkins Credentials

Add in Jenkins → Manage Jenkins → Credentials:

- Kind: Secret text
- ID: `openai-api-key`
- Secret: Your OpenAI API key

---

## CircleCI

### `.circleci/config.yml`

```yaml
version: 2.1

orbs:
  node: circleci/node@5.2

jobs:
  agentqa:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      
      - node/install-packages:
          pkg-manager: npm
      
      - run:
          name: Install AgentQA
          command: npm install -g agentqa
      
      - run:
          name: Generate Tests
          command: agentqa heal ./src --framework vitest
      
      - run:
          name: Run Tests
          command: agentqa run ./src --coverage
      
      - store_test_results:
          path: test-results
      
      - store_artifacts:
          path: coverage

workflows:
  test:
    jobs:
      - agentqa:
          context: openai-context
```

### CircleCI Context

Create a context with `OPENAI_API_KEY` in Organization Settings → Contexts.

---

## Azure DevOps

### `azure-pipelines.yml`

```yaml
trigger:
  branches:
    include:
      - main

pr:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: agentqa-secrets

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: |
      npm install -g agentqa
      npm ci
    displayName: 'Install Dependencies'

  - script: |
      agentqa heal ./src --framework vitest --max-retries 3
    displayName: 'Generate Tests'
    env:
      OPENAI_API_KEY: $(OPENAI_API_KEY)

  - script: |
      agentqa run ./src --coverage
    displayName: 'Run Tests'

  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '**/test-results.xml'

  - task: PublishCodeCoverageResults@1
    inputs:
      codeCoverageTool: 'Cobertura'
      summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'
```

---

## Bitbucket Pipelines

### `bitbucket-pipelines.yml`

```yaml
image: node:20

pipelines:
  pull-requests:
    '**':
      - step:
          name: AgentQA
          caches:
            - node
          script:
            - npm install -g agentqa
            - npm ci
            - agentqa heal ./src --framework vitest
            - agentqa run ./src --coverage
          artifacts:
            - coverage/**
```

Add `OPENAI_API_KEY` in Repository Settings → Pipelines → Repository variables.

---

## Best Practices

### 1. Run on PRs Only

Don't generate tests on every push to main:

```yaml
on:
  pull_request:
    branches: [main]
  # NOT: push: branches: [main]
```

### 2. Limit Files Per Run

Process incrementally to avoid timeouts:

```yaml
- uses: agentqa/agentqa@v1
  with:
    limit: 20  # Process max 20 files per PR
```

### 3. Use Caching

Speed up runs with dependency caching:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # Cache npm dependencies
```

### 4. Skip CI on Generated Commits

Avoid infinite loops:

```yaml
# Auto-commits include [skip ci]
git commit -m "test: add AI-generated tests [skip ci]"
```

### 5. Set Coverage Thresholds

Ensure quality standards:

```yaml
- uses: agentqa/agentqa@v1
  with:
    coverage-threshold: 70  # Fail if below 70%
```

---

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | Success | Pipeline passes |
| `1` | Test failures | Review generated tests |
| `2` | Coverage below threshold | Add more tests |
| `3` | Configuration error | Check config file |
| `4` | API key missing | Check secrets |

---

## Troubleshooting CI

### "API key not found"

- Verify secret name matches exactly (`OPENAI_API_KEY`)
- Check secret is available to the workflow/job
- For forks, secrets aren't available by default

### "Permission denied" on commit

GitHub Actions:
```yaml
permissions:
  contents: write
  pull-requests: write
```

GitLab: Use a deploy token or project access token.

### Rate Limits

- Reduce `limit` to process fewer files
- Run less frequently (push to main only)
- Use `gpt-3.5-turbo` for cost savings

### Timeouts

- Increase job timeout
- Reduce `max-retries`
- Process fewer files per run

See [Troubleshooting](troubleshooting.md) for more solutions.
