# Weekly Feedback Template

Use for async (Slack/email) or sync (call) check-ins with beta users.

---

## Quick Async Check-in (5 min)

Send weekly via Slack or email:

```
Hey {{name}}! Quick weekly check-in on AgentQA:

1. **Wins:** Did AgentQA catch anything useful this week?

2. **Misses:** Any false positives or missed bugs?

3. **Friction:** Anything confusing or annoying?

4. **Wish list:** One thing you wish it did?

5. **Score:** How likely are you to recommend AgentQA? (1-10)

Reply with quick bullets — no need for essays!
```

---

## Detailed Sync Check-in (15 min)

For calls or deeper async feedback:

### Usage & Value

1. How many PRs did AgentQA analyze this week?
   - [ ] 0-2
   - [ ] 3-5
   - [ ] 6-10
   - [ ] 10+

2. How many findings were actually useful?
   - [ ] None
   - [ ] A few
   - [ ] Most
   - [ ] All

3. Did AgentQA catch anything that would have been a bug in production?
   - [ ] Yes (describe)
   - [ ] No
   - [ ] Not sure

4. Any false positives that were annoying?
   - [ ] Yes (describe)
   - [ ] No

### Experience

5. On a scale of 1-10, how easy is AgentQA to use?
   Score: ___
   Why?

6. Is the GitHub integration working smoothly?
   - [ ] Yes
   - [ ] Some issues (describe)
   - [ ] Major problems (describe)

7. Are the findings/reports clear and actionable?
   - [ ] Yes
   - [ ] Somewhat
   - [ ] No (what's confusing?)

### Team Adoption

8. How many people on your team have seen AgentQA findings?
   Number: ___

9. What's the general reaction?
   - [ ] Positive
   - [ ] Neutral
   - [ ] Skeptical
   - [ ] Negative

10. Any quotes or reactions worth noting?

### Product Direction

11. What's the #1 thing you wish AgentQA did that it doesn't?

12. What would make you pay for this?

13. What would make you stop using it?

14. Any other feedback or ideas?

### NPS

15. How likely are you to recommend AgentQA to a friend? (0-10)
    Score: ___

16. Why that score?

---

## Tracking Template

Keep a running doc for each beta user:

```markdown
# {{Company}} - Beta Feedback Log

**Contact:** {{name}} ({{email}})
**Started:** {{date}}
**Repo:** {{repo_name}}

## Weekly Check-ins

### Week 1 - {{date}}
- **NPS:** X/10
- **PRs analyzed:** X
- **Useful findings:** X
- **Top feedback:** 
- **Bugs/issues:**
- **Feature requests:**

### Week 2 - {{date}}
...
```

---

## Red Flags to Watch For

**Engagement dropping:**
- Not responding to check-ins
- No PRs being analyzed
- Removed GitHub App

**Product issues:**
- Consistent false positives
- Agent not triggering
- Confusing results

**Bad fit:**
- Not using AI coding tools
- Very low PR volume
- No interest in feedback

**Action:** Proactively reach out if you see these. Don't wait for them to churn silently.

---

## Great Signs

- Unprompted positive feedback
- Sharing with teammates
- Asking about pricing
- Requesting features (means they're invested)
- NPS 9-10

**Action:** Ask for testimonial, referral, or case study.

---

## Question Bank

Mix these into check-ins to get deeper insights:

**Value:**
- "If AgentQA disappeared tomorrow, what would you miss?"
- "What's the biggest bug AgentQA has caught so far?"
- "How much time do you think AgentQA saves per week?"

**Competition:**
- "What did you use before AgentQA?"
- "Have you tried any other testing tools recently?"
- "How does this compare to your previous QA process?"

**Pricing:**
- "What would you expect to pay for this?"
- "Would you pay per seat, per repo, or per PR?"
- "What's your budget for dev tools?"

**Referral:**
- "Know anyone else who might want to try this?"
- "Would you be open to a quick case study?"
- "Can I quote you on that feedback?"
