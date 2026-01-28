# Troubleshooting

Solutions for common AgentQA issues.

---

## Installation Issues

### "command not found: agentqa"

**Cause:** Global npm bin directory not in PATH.

**Solution:**

```bash
# Check npm global prefix
npm config get prefix

# Add to PATH (bash/zsh)
export PATH="$(npm config get prefix)/bin:$PATH"

# Or use npx
npx agentqa scan ./src
```

### "EACCES: permission denied"

**Cause:** npm global directory needs elevated permissions.

**Solution:**

```bash
# Option 1: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Option 2: Use sudo (not recommended)
sudo npm install -g agentqa
```

### Node.js Version Error

**Cause:** AgentQA requires Node.js 18+.

**Solution:**

```bash
# Check version
node --version

# Upgrade with nvm
nvm install 20
nvm use 20
```

---

## API Key Issues

### "OPENAI_API_KEY not set"

**Cause:** Environment variable not configured.

**Solutions:**

```bash
# Set for current session
export OPENAI_API_KEY=sk-your-key-here

# Or add to .env file
echo "OPENAI_API_KEY=sk-your-key-here" >> .env

# Verify
echo $OPENAI_API_KEY
```

### "Invalid API key"

**Cause:** Key is malformed or revoked.

**Solutions:**

1. Verify key starts with `sk-`
2. Check for extra whitespace
3. Regenerate key at [OpenAI Platform](https://platform.openai.com/api-keys)

### "Rate limit exceeded"

**Cause:** Too many API requests.

**Solutions:**

```bash
# Reduce concurrent requests
agentqa generate ./src --limit 5

# Wait and retry
sleep 60 && agentqa generate ./src
```

For persistent issues:
- Upgrade OpenAI plan
- Use `--model gpt-3.5-turbo` (lower rate limits)

### "Insufficient quota"

**Cause:** OpenAI account needs billing.

**Solution:** Add payment method at [OpenAI Billing](https://platform.openai.com/account/billing).

---

## Scanning Issues

### "No testable exports found"

**Cause:** Code doesn't export anything.

**Solutions:**

1. Ensure functions/classes are exported:
   ```typescript
   // ❌ Not exported
   function helper() {}
   
   // ✅ Exported
   export function helper() {}
   ```

2. Check include patterns:
   ```bash
   agentqa scan ./src --include "**/*.ts,**/*.js"
   ```

### "Path does not exist"

**Cause:** Invalid path specified.

**Solution:**

```bash
# Use relative path from current directory
agentqa scan ./src

# Or absolute path
agentqa scan /home/user/project/src

# Check path exists
ls -la ./src
```

### "No files matched"

**Cause:** Include/exclude patterns too restrictive.

**Solution:**

```bash
# Debug: see what files match
agentqa scan ./src --verbose

# Adjust patterns
agentqa scan ./src --include "**/*.ts" --exclude "**/test/**"
```

---

## Generation Issues

### "Framework not detected"

**Cause:** No test framework found in dependencies.

**Solutions:**

1. Install a test framework:
   ```bash
   npm install -D vitest
   # or
   npm install -D jest
   ```

2. Specify explicitly:
   ```bash
   agentqa generate ./src --framework vitest
   ```

### Tests Don't Compile

**Cause:** Generated imports are wrong.

**Solutions:**

1. Use healing mode:
   ```bash
   agentqa heal ./src --framework vitest --max-retries 5
   ```

2. Check `tsconfig.json` paths are correct

3. Verify dependencies are installed:
   ```bash
   npm install
   ```

### Tests Fail Repeatedly

**Cause:** Code has complex dependencies or side effects.

**Solutions:**

1. Increase retries:
   ```bash
   agentqa heal ./src --max-retries 5
   ```

2. Use a better model:
   ```bash
   agentqa generate ./src --model gpt-4-turbo
   ```

3. Generate for specific files:
   ```bash
   agentqa gen-file ./src/simple-file.ts --framework vitest
   ```

4. Add mock configuration in your test setup

### "Context length exceeded"

**Cause:** Source file too large for AI model.

**Solutions:**

1. Split large files into smaller modules

2. Exclude large files:
   ```bash
   agentqa scan ./src --exclude "**/large-file.ts"
   ```

3. Use model with larger context:
   ```bash
   agentqa generate ./src --model gpt-4-turbo
   ```

---

## Test Execution Issues

### "Cannot find module"

**Cause:** Import paths don't resolve.

**Solutions:**

1. Check `tsconfig.json` paths:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"]
       }
     }
   }
   ```

2. Install missing dependencies:
   ```bash
   npm install
   ```

3. Configure test framework paths:
   ```typescript
   // vitest.config.ts
   export default {
     resolve: {
       alias: {
         '@': '/src'
       }
     }
   }
   ```

### "Test timeout"

**Cause:** Tests take too long or hang.

**Solutions:**

1. Increase timeout in test config:
   ```typescript
   // vitest.config.ts
   export default {
     test: {
       testTimeout: 30000
     }
   }
   ```

2. Mock slow operations (network, database)

### Coverage Not Reported

**Cause:** Coverage tool not configured.

**Solutions:**

1. For Vitest:
   ```bash
   npm install -D @vitest/coverage-v8
   ```
   
   ```typescript
   // vitest.config.ts
   export default {
     test: {
       coverage: {
         provider: 'v8'
       }
     }
   }
   ```

2. For Jest:
   ```bash
   npm install -D jest
   ```
   
   ```json
   // package.json
   {
     "jest": {
       "collectCoverage": true
     }
   }
   ```

---

## CI/CD Issues

### GitHub Actions: "Permission denied"

**Cause:** Workflow lacks write permissions.

**Solution:**

```yaml
jobs:
  agentqa:
    permissions:
      contents: write
      pull-requests: write
```

### GitHub Actions: Secrets Not Available

**Cause:** Secrets don't pass to forks.

**Solutions:**

1. For fork PRs, use `pull_request_target`:
   ```yaml
   on:
     pull_request_target:
       branches: [main]
   ```
   ⚠️ Security risk - review carefully

2. Require PRs from same repo only

### Commits Create Infinite Loop

**Cause:** CI triggers on its own commits.

**Solution:**

```bash
# Include skip flag in commit
git commit -m "test: add tests [skip ci]"
```

Or in workflow:
```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - '**/*.test.ts'
```

### GitLab: "Push failed"

**Cause:** CI job lacks push permissions.

**Solution:**

Use a project access token with `write_repository` scope:

```yaml
script:
  - git remote set-url origin "https://oauth2:${PROJECT_TOKEN}@gitlab.com/${CI_PROJECT_PATH}.git"
  - git push origin HEAD:$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME
```

---

## API Server Issues

### "Port already in use"

**Cause:** Another process using port 3847.

**Solutions:**

```bash
# Use different port
agentqa serve --port 8080

# Or find and kill existing process
lsof -i :3847
kill -9 <PID>
```

### "Connection refused"

**Cause:** Server not running or wrong host.

**Solutions:**

1. Start the server:
   ```bash
   agentqa serve
   ```

2. Check it's listening:
   ```bash
   curl http://localhost:3847/api/health
   ```

3. For remote access:
   ```bash
   agentqa serve --host 0.0.0.0
   ```

---

## Billing Issues

### "License invalid"

**Cause:** License key expired or malformed.

**Solutions:**

1. Verify format: `AQAT-XXXX-XXXX-XXXX-XXXX`
2. Check subscription status in Stripe Dashboard
3. Contact support for key reissue

### Webhook Not Receiving Events

**Cause:** Webhook endpoint misconfigured.

**Solutions:**

1. Verify endpoint URL in Stripe Dashboard
2. Check webhook signing secret
3. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3847/api/billing/webhook
   ```

---

## Getting Help

### Collect Debug Info

```bash
# Version info
agentqa --version
node --version
npm --version

# Verbose output
agentqa scan ./src --verbose 2>&1 | tee debug.log

# Configuration
agentqa validate
```

### Open an Issue

Include:
1. AgentQA version
2. Node.js version
3. OS and version
4. Full error message
5. Steps to reproduce
6. Relevant config (redact secrets!)

[Open GitHub Issue](https://github.com/natmart/agentqa/issues/new)

---

## FAQ

**Q: Does AgentQA send my code to OpenAI?**

A: Yes, source code is sent to OpenAI's API for test generation. Use `--dry-run` to preview without sending.

**Q: Can I use a local LLM?**

A: Yes, set `OPENAI_BASE_URL` to any OpenAI-compatible API (Ollama, LocalAI, etc.).

**Q: Why are tests generated for internal functions?**

A: AgentQA tests all exported functions. Use `exclude` patterns to skip internal modules.

**Q: How do I test private methods?**

A: AgentQA tests public API only. Refactor to expose methods or test through public interfaces.

**Q: Can I customize the generated test style?**

A: Use `.agentqa.yml`:
```yaml
generation:
  style: unit
  edgeCases: true
  comments: true
```
