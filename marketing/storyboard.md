# AgentQA Demo Video Storyboard

**Total Runtime:** 2:45  
**Format:** 16:9, 1080p minimum (4K preferred)  
**Style:** Dark mode, developer-focused, clean and modern

---

## Scene 1: HOOK
**Duration:** 0:00 - 0:15 (15 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 0:00-0:03 | Black screen, single terminal cursor blinking | (silence, anticipation) | Build tension |
| 0:03-0:08 | Code starts generating rapidly in terminal, test files appearing | "What if your CI could write its own tests?" | Text appears typed, then accelerates |
| 0:08-0:12 | Slow zoom out revealing full IDE with multiple test files | (beat - let it land) | Music begins softly |
| 0:12-0:15 | AgentQA logo subtle watermark appears | "Not someday. Not with a team of QA engineers. Right now. Automatically." | Confident tone |

---

## Scene 2: THE PROBLEM - Part 1
**Duration:** 0:15 - 0:30 (15 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 0:15-0:18 | Developer at desk, overwhelmed expression, multiple monitors | "Let's be honest about testing." | Relatable, not mocking |
| 0:18-0:22 | Jira/Linear board zoom - dozens of "write tests" tickets | "You know you need more coverage." | Tickets multiply |
| 0:22-0:26 | Split: PM pointing at roadmap / Security audit document | "Your PM knows. That security audit definitely knows." | Quick cuts |
| 0:26-0:30 | Coverage report: big red "47%" with uncovered files listed | (let visual speak) | Uncomfortable pause |

---

## Scene 3: THE PROBLEM - Part 2
**Duration:** 0:30 - 0:45 (15 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 0:30-0:34 | Time-lapse of developer writing tests, clock spinning | "But manual test writing is slow. It's expensive." | Emphasize tedium |
| 0:34-0:38 | Shipping velocity graph vs test coverage graph diverging | "And it never keeps up with how fast you ship." | Lines dramatically separate |
| 0:38-0:41 | Rapid montage: skipped tests, red CI badge, Slack "tests failing" | "So tests get skipped. Coverage gaps grow." | Quick cuts, building anxiety |
| 0:41-0:45 | Production error page / PagerDuty alert on phone at 2am | "And eventually, bugs make it to production. We've all been there." | Sympathetic, not preachy |

---

## Scene 4: THE SOLUTION - Intro
**Duration:** 0:45 - 1:00 (15 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 0:45-0:48 | AgentQA logo animation (clean, geometric, confident) | (music shift - hopeful) | Transition moment |
| 0:48-0:52 | Logo settles into clean terminal interface | "AgentQA is an AI agent that lives in your CI pipeline." | Show GitHub Actions context |
| 0:52-0:56 | Animated diagram: code → AgentQA → tests | "It doesn't just run your tests." | Simple iconography |
| 0:56-1:00 | Three icons appear: Scan, Generate, Heal | "It writes them. It maintains them. It heals them when they break." | Icons pulse on mention |

---

## Scene 5: THE SOLUTION - Three Steps
**Duration:** 1:00 - 1:15 (15 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 1:00-1:05 | SCAN: Code files being analyzed, coverage map building | "Scan — AgentQA analyzes your codebase, understands your architecture, finds what's untested." | Visualization of code understanding |
| 1:05-1:10 | GENERATE: Test files materializing, green checkmarks | "Generate — It writes production-quality tests that actually matter. Unit tests. Integration tests. Edge cases you'd never think of." | Tests appear with satisfying animation |
| 1:10-1:15 | HEAL: Red test → gears turning → green test | "Heal — When code changes break tests, AgentQA fixes them automatically." | Self-repair visualization |

---

## Scene 6: DEMO - Setup
**Duration:** 1:15 - 1:25 (10 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 1:15-1:18 | Transition to full-screen terminal (iTerm2/Warp style) | "Let me show you what this looks like in practice." | Clean, dark theme |
| 1:18-1:22 | Show project structure briefly - `/src`, `/tests` (sparse) | (no narration - ambient music) | Establish context |
| 1:22-1:25 | Cursor ready at prompt `~/myapp $` | (anticipation) | Beat before action |

---

## Scene 7: DEMO - Scan Command
**Duration:** 1:25 - 1:40 (15 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 1:25-1:28 | Type: `agentqa scan` | "One command. AgentQA scans your entire codebase." | Realistic typing speed |
| 1:28-1:35 | Output streams: analyzing files, building map, coverage calc | (let output speak) | Show real-looking output |
| 1:35-1:40 | Final output: "Found 12 critical functions with 0% coverage" highlighting `src/payments/` | "It finds 12 critical functions with zero test coverage. Including your payment processing module." | Red highlight on critical paths |

**Terminal Output to Show:**
```
$ agentqa scan

🔍 Scanning codebase...
   ├── src/          287 files
   ├── lib/           43 files
   └── tests/         12 files

📊 Analyzing coverage gaps...

⚠️  CRITICAL: 12 functions with 0% coverage
   └── src/payments/processor.ts    (0%)
   └── src/payments/refund.ts       (0%)
   └── src/auth/oauth.ts            (0%)
   └── ... and 9 more

📈 Current coverage: 47% → Potential: 89%

Run `agentqa generate` to create tests
```

---

## Scene 8: DEMO - Generate Command
**Duration:** 1:40 - 1:55 (15 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 1:40-1:43 | Type: `agentqa generate --target src/payments/` | "Generate tests for that module." | Focused generation |
| 1:43-1:50 | Output: tests being written, files appearing in real-time | (watching it work) | Satisfying progress |
| 1:50-1:55 | Summary: "34 tests generated in 47s" | "In under a minute, you have 34 new tests covering edge cases, error handling, and happy paths." | Show file tree updating |

**Terminal Output to Show:**
```
$ agentqa generate --target src/payments/

🤖 Generating tests for src/payments/...

  ✓ processor.test.ts (12 tests)
    • successful payment flow
    • insufficient funds handling
    • network timeout retry
    • idempotency key validation
    • ... +8 more

  ✓ refund.test.ts (8 tests)
    • full refund processing
    • partial refund calculation
    • refund window validation
    • ... +5 more

  ✓ webhooks.test.ts (14 tests)
    • signature verification
    • event deduplication
    • ... +12 more

✅ Generated 34 tests in 47s
   Coverage: 47% → 78%
```

---

## Scene 9: DEMO - Run Command
**Duration:** 1:55 - 2:05 (10 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 1:55-1:57 | Type: `agentqa run` | "Run them." | Simple, confident |
| 1:57-2:02 | Tests executing, all green checkmarks streaming | (satisfying test pass sounds) | Quick, all passing |
| 2:02-2:05 | Final summary: "34/34 passed, coverage 78%" | "All passing. Coverage jumped from 47% to 78%." | Celebration moment |

**Terminal Output to Show:**
```
$ agentqa run

  PASS  src/payments/processor.test.ts (12 tests)
  PASS  src/payments/refund.test.ts (8 tests)
  PASS  src/payments/webhooks.test.ts (14 tests)

✅ 34/34 tests passed
📈 Coverage: 78% (+31%)
⏱️  Total time: 4.2s
```

---

## Scene 10: DEMO - GitHub Integration
**Duration:** 2:05 - 2:20 (15 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 2:05-2:08 | Transition to GitHub PR interface | "But here's where it gets powerful." | Smooth transition |
| 2:08-2:12 | Show PR with AgentQA bot comment appearing | "AgentQA runs on every PR." | Bot avatar, formatted comment |
| 2:12-2:16 | Zoom into comment: coverage diff, risk analysis | "It comments with coverage analysis, suggests new tests, and flags risky changes." | Highlight key sections |
| 2:16-2:20 | Show "Suggest tests" button, tests appearing | "Your team reviews code. AgentQA reviews test coverage." | One-click test generation |

**GitHub Comment to Show:**
```
## 🤖 AgentQA Coverage Report

### Coverage Impact
| File | Before | After | Δ |
|------|--------|-------|---|
| src/payments/processor.ts | 45% | 92% | +47% ✅ |
| src/payments/refund.ts | 0% | 85% | +85% ✅ |

### ⚠️ Risk Analysis
- `processPayment()` modified but has edge cases untested
- New function `validateCard()` has 0% coverage

### 💡 Suggested Tests
AgentQA can generate 3 additional tests for this PR.
[Generate Tests] [Dismiss]
```

---

## Scene 11: DEMO - Self-Healing
**Duration:** 2:20 - 2:30 (10 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 2:20-2:23 | Show terminal: `agentqa heal` | "And when someone refactors that payment module next month?" | Future scenario |
| 2:23-2:27 | Output: detecting broken tests, analyzing changes, fixing | "AgentQA detects the broken tests and fixes them." | Show the magic |
| 2:27-2:30 | Green checkmarks, "3 tests healed" | "Automatically. In the same PR. No more 'fix flaky tests' tickets sitting in your backlog." | Satisfying resolution |

**Terminal Output to Show:**
```
$ agentqa heal

🔍 Analyzing test failures...

  ✗ processor.test.ts:45 - expected 'process' got 'handle'
    → Function renamed: processPayment → handlePayment
    → Fixing references...
    ✓ Fixed

  ✗ refund.test.ts:23 - missing property 'amount'
    → Interface changed: added required 'currency' field
    → Updating test data...
    ✓ Fixed

✅ Healed 3 tests automatically
   All tests passing
```

---

## Scene 12: SOCIAL PROOF
**Duration:** 2:30 - 2:38 (8 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 2:30-2:34 | Stats graphic: "40% faster" "50% fewer bugs" | "Teams using AgentQA ship 40% faster with half the production bugs." | Clean data viz |
| 2:34-2:38 | Testimonial quote or beta user logos | "Because they stopped choosing between speed and quality." | Build credibility |

---

## Scene 13: CTA
**Duration:** 2:38 - 2:50 (12 seconds)

| Timestamp | Visual | Audio/Narration | Notes |
|-----------|--------|-----------------|-------|
| 2:38-2:41 | AgentQA website hero section | "AgentQA is currently in private beta." | Show the signup form |
| 2:41-2:44 | Cursor clicking "Join Beta" button | "Join the waitlist at agentqa.dev" | Clear action |
| 2:44-2:47 | Logo centered, tagline appearing below | "and be first in line when we open up." | |
| 2:47-2:50 | End card: Logo + "agentqa.dev" + "Your CI writes its own tests now." | "AgentQA. Your CI writes its own tests now." | Final beat |

---

## Visual Assets Needed

### Screen Recordings
- [ ] Terminal running `agentqa scan`
- [ ] Terminal running `agentqa generate`
- [ ] Terminal running `agentqa run`
- [ ] Terminal running `agentqa heal`
- [ ] GitHub PR with AgentQA bot comment

### Animations
- [ ] AgentQA logo intro animation
- [ ] Scan/Generate/Heal icon animations
- [ ] Coverage percentage climbing animation
- [ ] Code-to-test transformation visual

### Stock/B-Roll
- [ ] Developer at desk (frustrated → relieved)
- [ ] Jira/project board chaos
- [ ] Late night coding montage
- [ ] Production incident stress

### Graphics
- [ ] Coverage report mockup (47% → 78%)
- [ ] Velocity vs Coverage diverging graph
- [ ] "40% faster / 50% fewer bugs" stats card
- [ ] End card with logo and URL

---

## Transitions

| From → To | Transition Type | Duration |
|-----------|-----------------|----------|
| Hook → Problem | Quick cut | 0.2s |
| Problem scenes | Jump cuts | 0.1s |
| Problem → Solution | Logo wipe | 0.5s |
| Solution → Demo | Fade to terminal | 0.3s |
| Demo scenes | Direct cuts | 0s |
| Demo → GitHub | Slide left | 0.3s |
| GitHub → Heal | Slide left | 0.3s |
| Heal → Social | Fade | 0.4s |
| Social → CTA | Fade | 0.4s |
