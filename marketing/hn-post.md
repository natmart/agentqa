# Hacker News "Show HN" Post

---

## Title Options (pick one)

1. **Show HN: AgentQA – Autonomous testing agents for AI-generated code**
2. **Show HN: We built QA agents that catch what Copilot/Cursor miss**
3. **Show HN: AgentQA – Testing that keeps up with AI-assisted development**

---

## Post Body

**Show HN: AgentQA – Autonomous testing agents for AI-generated code**

Hey HN,

We've been using AI coding assistants (Cursor, Copilot, Claude) for the past year and noticed a pattern: the code ships faster, but subtle bugs slip through more often.

AI-generated code tends to have specific failure modes:
- Missing null checks
- Off-by-one errors in edge cases  
- Race conditions in async code
- Incomplete error handling

Traditional test suites don't catch these well because they weren't designed for AI-generated code patterns.

So we built AgentQA.

**What it does:**
- Connects to your GitHub repo
- Analyzes PRs for AI-generated code patterns
- Automatically generates targeted edge case tests
- Reports potential issues before merge

**Technical details:**
- Currently supports TypeScript/JavaScript
- Runs as a GitHub Action
- Uses a fine-tuned model trained on real AI-generated bugs
- No code leaves your CI environment (we analyze AST, not raw code)

**What we're looking for:**
We're opening beta to 10 teams. Ideal fit is 20-50 person startups using TypeScript and shipping frequently with AI assistance.

Free during beta. We'll help you set up personally.

Link: [agentqa.dev]

Happy to answer questions about the approach, architecture, or our findings on AI-generated bug patterns.

---

## Expected Questions & Answers

**Q: How is this different from existing testing tools?**
A: Traditional tools test your code as-is. We specifically target patterns that AI coding assistants tend to get wrong — things like async edge cases, implicit type coercion, and boundary conditions. We trained on a dataset of real bugs from AI-generated code.

**Q: Does my code leave my environment?**
A: No. We analyze AST representations and metadata in your CI. Raw code stays in your GitHub Action runner.

**Q: Why TypeScript only?**
A: Starting narrow to nail the experience. Python is next on the roadmap. The underlying approach works for any language.

**Q: How does it know if code is AI-generated?**
A: We look for patterns, not labels. AI-generated code has recognizable characteristics — variable naming, comment styles, certain architectural choices. But honestly, the edge case testing is useful regardless of whether code is human or AI-written.

**Q: What's the pricing going to be?**
A: Still figuring it out. Beta is free. Likely usage-based (per PR or per seat) when we launch.

**Q: Can I self-host?**
A: Not yet, but it's on the roadmap. We want to get the product right first.

---

## HN Etiquette Reminders

- Don't be defensive in comments
- Acknowledge valid criticism
- Share technical details freely
- Upvote thoughtful critical comments
- Don't ask friends to upvote
- Post at 8-9am PT for best visibility
- Check and respond to comments for 24+ hours
