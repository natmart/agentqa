# AgentQA Demo Video Script

**Target Duration:** 2:30 - 3:00 minutes  
**Tone:** Professional but approachable, confident, slightly urgent  
**Voice:** Clear, modern, tech-forward (think Stripe/Vercel style)

---

## HOOK (0:00 - 0:15)

**[VISUAL: Terminal cursor blinking, then code rapidly generating]**

> "What if your CI could write its own tests?"

**[BEAT]**

> "Not someday. Not with a team of QA engineers. Right now. Automatically."

---

## THE PROBLEM (0:15 - 0:45)

**[VISUAL: Split screen showing overwhelmed developer, Jira tickets piling up, red CI badges]**

> "Let's be honest about testing."

> "You know you need more coverage. Your PM knows. That security audit definitely knows."

**[VISUAL: Coverage report showing 47% with red highlighting]**

> "But manual test writing is slow. It's expensive. And it never keeps up with how fast you ship."

**[VISUAL: Montage of failing tests, late-night commits, frustrated Slack messages]**

> "So tests get skipped. Coverage gaps grow. And eventually, bugs make it to production."

> "We've all been there."

---

## THE SOLUTION (0:45 - 1:15)

**[VISUAL: AgentQA logo animation, then clean terminal interface]**

> "AgentQA is an AI agent that lives in your CI pipeline."

> "It doesn't just run your tests. It writes them. It maintains them. It heals them when they break."

**[VISUAL: Three-step animated diagram]**

> "Here's how it works:"

> "**Scan** — AgentQA analyzes your codebase, understands your architecture, finds what's untested."

**[VISUAL: Scan animation with code files being analyzed]**

> "**Generate** — It writes production-quality tests that actually matter. Unit tests. Integration tests. Edge cases you'd never think of."

**[VISUAL: Test files appearing, green checkmarks]**

> "**Heal** — When code changes break tests, AgentQA fixes them automatically. No more flaky test maintenance."

**[VISUAL: Self-healing animation, red test turning green]**

---

## DEMO WALKTHROUGH (1:15 - 2:15)

**[VISUAL: Clean terminal, developer's perspective]**

> "Let me show you what this looks like in practice."

### Scan

**[VISUAL: Terminal typing `agentqa scan`]**

> "One command. AgentQA scans your entire codebase."

**[VISUAL: Output showing files analyzed, coverage gaps identified]**

> "It finds 12 critical functions with zero test coverage. Including your payment processing module."

### Generate

**[VISUAL: Terminal typing `agentqa generate --target src/payments/`]**

> "Generate tests for that module."

**[VISUAL: Tests being written in real-time, file by file]**

> "In under a minute, you have 34 new tests covering edge cases, error handling, and happy paths."

### Run

**[VISUAL: Terminal typing `agentqa run`]**

> "Run them."

**[VISUAL: Test results streaming, all green]**

> "All passing. Coverage jumped from 47% to 78%."

### GitHub Integration

**[VISUAL: GitHub PR interface, AgentQA bot comment]**

> "But here's where it gets powerful."

> "AgentQA runs on every PR. It comments with coverage analysis, suggests new tests, and flags risky changes."

**[VISUAL: PR comment showing coverage diff, suggested tests]**

> "Your team reviews code. AgentQA reviews test coverage."

### Self-Healing

**[VISUAL: Terminal showing `agentqa heal`]**

> "And when someone refactors that payment module next month?"

**[VISUAL: Failing tests detected, then automatically fixed]**

> "AgentQA detects the broken tests and fixes them. Automatically. In the same PR."

> "No more 'fix flaky tests' tickets sitting in your backlog."

---

## SOCIAL PROOF (2:15 - 2:30)

**[VISUAL: Logos of beta users or testimonial quotes]**

> "Teams using AgentQA ship 40% faster with half the production bugs."

> "Because they stopped choosing between speed and quality."

---

## CTA (2:30 - 2:45)

**[VISUAL: AgentQA website, beta signup form]**

> "AgentQA is currently in private beta."

> "Join the waitlist at agentqa.dev and be first in line when we open up."

**[VISUAL: Logo + tagline]**

> "AgentQA. Your CI writes its own tests now."

**[END CARD: agentqa.dev | "Join the Beta"]**

---

## PRODUCTION NOTES

### Music
- Modern electronic, builds tension during problem section
- Resolves to confident, upbeat during solution/demo
- Subtle, doesn't compete with voiceover

### Pacing
- Quick cuts during problem section (urgency)
- Slower, more deliberate during demo (clarity)
- Punchy ending (action)

### Visual Style
- Dark theme terminal (matches developer aesthetic)
- Clean, minimal UI mockups
- Smooth transitions, no flashy effects
- Code should be readable, not just decoration

### Voice Direction
- Not salesy or hype-y
- Developer talking to developer
- Confident but not arrogant
- Slightly faster pace during problem, slower during demo
