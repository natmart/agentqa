# AgentQA Demo Commands

Commands and outputs to record for the demo video. Use a clean terminal with dark theme (Dracula, One Dark, or similar).

---

## Environment Setup

### Terminal Preferences
```bash
# Recommended: iTerm2, Warp, or Hyper
# Theme: Dark (Dracula, One Dark, Tokyo Night)
# Font: JetBrains Mono, Fira Code, or SF Mono
# Font size: 16-18pt (readable on video)
# Line height: 1.3-1.4
```

### Demo Project Setup
```bash
# Create a realistic-looking project structure
mkdir -p ~/demo-app/{src/payments,src/auth,src/api,tests,lib}

# Add some placeholder files to make it look real
touch ~/demo-app/src/payments/{processor.ts,refund.ts,webhooks.ts}
touch ~/demo-app/src/auth/{oauth.ts,session.ts}
touch ~/demo-app/src/api/{routes.ts,middleware.ts}
touch ~/demo-app/tests/{api.test.ts,auth.test.ts}
touch ~/demo-app/{package.json,tsconfig.json,.env}

cd ~/demo-app
```

---

## Command 1: `agentqa scan`

### What to Type
```bash
agentqa scan
```

### Expected Output (mock/script this)
```
$ agentqa scan

🔍 Scanning codebase...

Analyzing project structure...
   ├── src/              287 files analyzed
   │   ├── payments/       4 files
   │   ├── auth/           3 files
   │   └── api/           12 files
   ├── lib/               43 files analyzed
   └── tests/             12 files found

📊 Building coverage map...

┌─────────────────────────────────────────────────────────┐
│  COVERAGE ANALYSIS                                      │
├─────────────────────────────────────────────────────────┤
│  Current coverage:  47%  ████████░░░░░░░░░░░░          │
│  Potential:         89%  ██████████████████░░          │
└─────────────────────────────────────────────────────────┘

⚠️  CRITICAL GAPS DETECTED

  Priority    File                           Coverage   Risk
  ────────────────────────────────────────────────────────────
  🔴 HIGH     src/payments/processor.ts         0%     Payment logic untested
  🔴 HIGH     src/payments/refund.ts            0%     Refund flow untested
  🔴 HIGH     src/payments/webhooks.ts          0%     Webhook handling
  🟠 MEDIUM   src/auth/oauth.ts                12%     Auth flow gaps
  🟠 MEDIUM   src/auth/session.ts              23%     Session management
  🟡 LOW      src/api/routes.ts                45%     API endpoints
  ... and 6 more files

📈 Summary:
   • 12 critical functions with 0% coverage
   • 8 functions below 25% coverage
   • Estimated 34 tests needed for 80%+ coverage

💡 Run: agentqa generate --target src/payments/
   to generate tests for the highest-risk module
```

### Recording Notes
- Type command at natural speed (not too fast)
- Let output stream for ~3 seconds
- Pause on final summary for readability

---

## Command 2: `agentqa generate`

### What to Type
```bash
agentqa generate --target src/payments/
```

### Expected Output (mock/script this)
```
$ agentqa generate --target src/payments/

🤖 AgentQA Test Generator v0.1.0
   Target: src/payments/

Analyzing source files...
   ✓ processor.ts    (324 lines, 8 functions)
   ✓ refund.ts       (156 lines, 4 functions)
   ✓ webhooks.ts     (203 lines, 6 functions)

Understanding code patterns...
   ✓ Detected: Stripe SDK integration
   ✓ Detected: Async/await patterns
   ✓ Detected: Error handling with custom exceptions
   ✓ Detected: Idempotency key usage

Generating tests...

  📝 processor.test.ts
     ├── ✓ should process valid payment successfully
     ├── ✓ should handle insufficient funds error
     ├── ✓ should retry on network timeout
     ├── ✓ should validate idempotency key
     ├── ✓ should reject expired cards
     ├── ✓ should handle currency conversion
     ├── ✓ should log transaction for audit
     ├── ✓ should emit payment.completed event
     ├── ✓ should handle Stripe API errors gracefully
     ├── ✓ should validate payment amount limits
     ├── ✓ should handle duplicate payment attempts
     └── ✓ should timeout after 30 seconds
     [12 tests generated]

  📝 refund.test.ts
     ├── ✓ should process full refund
     ├── ✓ should calculate partial refund correctly
     ├── ✓ should enforce refund window policy
     ├── ✓ should handle already-refunded transactions
     ├── ✓ should validate refund amount <= original
     ├── ✓ should emit refund.processed event
     ├── ✓ should handle refund to expired card
     └── ✓ should require refund reason
     [8 tests generated]

  📝 webhooks.test.ts
     ├── ✓ should verify Stripe signature
     ├── ✓ should reject invalid signatures
     ├── ✓ should handle duplicate webhook events
     ├── ✓ should process payment_intent.succeeded
     ├── ✓ should process payment_intent.failed
     ├── ✓ should process charge.refunded
     ├── ✓ should handle unknown event types
     ├── ✓ should respond within timeout
     ├── ✓ should log webhook for debugging
     ├── ✓ should handle malformed payloads
     ├── ✓ should process events idempotently
     ├── ✓ should handle partial event data
     ├── ✓ should queue events for async processing
     └── ✓ should handle webhook replay
     [14 tests generated]

✅ Generation Complete

   Files created:    3
   Tests generated:  34
   Time elapsed:     47.2s

   Coverage impact:
   ┌──────────────────────────────────────┐
   │  Before:  47%  ████████░░░░░░░░░░░░  │
   │  After:   78%  ████████████████░░░░  │
   │           +31%  ▲▲▲▲▲▲▲▲             │
   └──────────────────────────────────────┘

💡 Run: agentqa run  to execute the generated tests
```

### Recording Notes
- Tests should "stream" in progressively (satisfying to watch)
- Slight pause between each file section
- Coverage visualization should be the hero moment

---

## Command 3: `agentqa run`

### What to Type
```bash
agentqa run
```

### Expected Output (mock/script this)
```
$ agentqa run

🧪 Running AgentQA test suite...

 PASS  src/payments/processor.test.ts (1.24s)
   ✓ should process valid payment successfully (45ms)
   ✓ should handle insufficient funds error (12ms)
   ✓ should retry on network timeout (89ms)
   ✓ should validate idempotency key (8ms)
   ✓ should reject expired cards (11ms)
   ✓ should handle currency conversion (23ms)
   ✓ should log transaction for audit (7ms)
   ✓ should emit payment.completed event (15ms)
   ✓ should handle Stripe API errors gracefully (34ms)
   ✓ should validate payment amount limits (6ms)
   ✓ should handle duplicate payment attempts (18ms)
   ✓ should timeout after 30 seconds (203ms)

 PASS  src/payments/refund.test.ts (0.87s)
   ✓ should process full refund (34ms)
   ✓ should calculate partial refund correctly (12ms)
   ✓ should enforce refund window policy (18ms)
   ✓ should handle already-refunded transactions (9ms)
   ✓ should validate refund amount <= original (7ms)
   ✓ should emit refund.processed event (11ms)
   ✓ should handle refund to expired card (23ms)
   ✓ should require refund reason (5ms)

 PASS  src/payments/webhooks.test.ts (2.12s)
   ✓ should verify Stripe signature (67ms)
   ✓ should reject invalid signatures (12ms)
   ✓ should handle duplicate webhook events (45ms)
   ✓ should process payment_intent.succeeded (89ms)
   ✓ should process payment_intent.failed (78ms)
   ✓ should process charge.refunded (56ms)
   ✓ should handle unknown event types (8ms)
   ✓ should respond within timeout (123ms)
   ✓ should log webhook for debugging (11ms)
   ✓ should handle malformed payloads (14ms)
   ✓ should process events idempotently (67ms)
   ✓ should handle partial event data (23ms)
   ✓ should queue events for async processing (89ms)
   ✓ should handle webhook replay (34ms)

──────────────────────────────────────────────────────

  Test Suites:  3 passed, 3 total
  Tests:        34 passed, 34 total
  Coverage:     78% (+31% from baseline)
  Time:         4.23s

✅ All tests passing!
```

### Recording Notes
- Tests should fly by quickly (satisfying)
- Green checkmarks are the hero
- Final summary should linger for 2 seconds

---

## Command 4: `agentqa heal`

### What to Type
```bash
agentqa heal
```

### Expected Output (mock/script this)
```
$ agentqa heal

🔧 AgentQA Self-Healing Mode

Detecting test failures...

 FAIL  src/payments/processor.test.ts
   ✗ should process valid payment successfully
     Expected: processPayment()
     Received: handlePayment()

 FAIL  src/payments/refund.test.ts
   ✗ should process full refund
     TypeError: Cannot read property 'amount' of undefined

 FAIL  src/payments/webhooks.test.ts
   ✗ should verify Stripe signature
     Expected mock to be called with 'webhook_secret'
     Received: 'whsec_live_xxxxx'

Analyzing source changes...

  📂 src/payments/processor.ts
     └── Line 45: Function renamed processPayment → handlePayment
         (commit abc1234: "refactor: rename payment functions")

  📂 src/payments/refund.ts
     └── Line 12: Interface RefundRequest added required 'currency' field
         (commit def5678: "feat: add multi-currency support")

  📂 src/payments/webhooks.ts
     └── Line 8: Config key changed 'webhook_secret' → 'stripe.webhookSecret'
         (commit ghi9012: "chore: restructure config")

Healing tests...

  🔧 processor.test.ts:23
     └── Updating function reference: processPayment → handlePayment
         ✓ Fixed

  🔧 refund.test.ts:45
     └── Adding required field to test data: { currency: 'USD' }
         ✓ Fixed

  🔧 webhooks.test.ts:12
     └── Updating config path in mock
         ✓ Fixed

Verifying fixes...

  ✓ processor.test.ts    All tests passing
  ✓ refund.test.ts       All tests passing
  ✓ webhooks.test.ts     All tests passing

──────────────────────────────────────────────────────

✅ Self-Healing Complete

   Tests healed:     3
   Tests verified:   34/34 passing
   Time elapsed:     12.4s

   No manual intervention required.
```

### Recording Notes
- Show the "detective work" - analyzing what changed
- The fix application should feel magical
- End on the satisfying "no manual intervention required"

---

## GitHub Actions Demo

### Show the workflow file
```yaml
# .github/workflows/agentqa.yml
name: AgentQA

on:
  pull_request:
    branches: [main]

jobs:
  test-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run AgentQA
        uses: agentqa/action@v1
        with:
          api-key: ${{ secrets.AGENTQA_API_KEY }}
          mode: analyze  # or 'generate' for auto-test creation
          
      - name: Comment on PR
        uses: agentqa/pr-comment@v1
        with:
          api-key: ${{ secrets.AGENTQA_API_KEY }}
```

### GitHub PR Comment (screenshot this)
Show a PR with the AgentQA bot comment:

```markdown
## 🤖 AgentQA Coverage Report

### 📊 Coverage Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Line Coverage | 47.2% | 78.4% | +31.2% ✅ |
| Branch Coverage | 34.1% | 71.2% | +37.1% ✅ |
| Function Coverage | 52.0% | 85.3% | +33.3% ✅ |

### 📁 Files Changed in This PR

| File | Coverage | Status |
|------|----------|--------|
| `src/payments/processor.ts` | 92% | ✅ Well tested |
| `src/payments/refund.ts` | 85% | ✅ Well tested |
| `src/payments/webhooks.ts` | 88% | ✅ Well tested |

### ⚠️ Attention Needed

**New untested code detected:**

- `src/payments/processor.ts:145-160` - New `validateCard()` function (0% coverage)
- `src/payments/refund.ts:78-82` - New error handling branch (0% coverage)

### 💡 Suggested Tests

AgentQA can generate **3 additional tests** to cover the gaps above.

[✨ Generate Tests](https://agentqa.dev/pr/123/generate) | [👀 View Details](https://agentqa.dev/pr/123) | [❌ Dismiss](https://agentqa.dev/pr/123/dismiss)

---
<sub>🤖 Powered by [AgentQA](https://agentqa.dev) | [Configure](https://agentqa.dev/settings) | [Docs](https://docs.agentqa.dev)</sub>
```

---

## Recording Tips

### Technical Setup
```bash
# Terminal recording tools
# - asciinema (for terminal-only)
# - OBS Studio (for full screen)
# - ScreenFlow (macOS)

# Clean your terminal history
history -c
clear

# Set a clean prompt
export PS1="$ "

# Hide any sensitive env vars
unset AWS_ACCESS_KEY_ID
unset STRIPE_SECRET_KEY
```

### Recording Checklist
- [ ] Close all notifications
- [ ] Hide bookmarks bar in browser
- [ ] Use incognito/clean browser profile for GitHub
- [ ] Set terminal to appropriate size (120x30 chars recommended)
- [ ] Test all commands before recording
- [ ] Have output scripts ready to paste/trigger

### Post-Production
- Speed up typing slightly (1.2-1.5x)
- Add subtle sound effects for checkmarks
- Color grade for consistency
- Add subtle zoom on important output sections
