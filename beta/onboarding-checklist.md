# Beta Onboarding Checklist

Step-by-step process to get a beta user from signup → active.

---

## Pre-Onboarding (Before Call)

- [ ] Review their beta application
- [ ] Check their GitHub org (public repos, activity level)
- [ ] Note their tech stack and frameworks
- [ ] Identify 1-2 repos that would be good candidates
- [ ] Prepare personalized demo based on their stack
- [ ] Send calendar invite with Zoom link
- [ ] Send pre-call email with agenda

### Pre-Call Email Template

```
Subject: AgentQA onboarding — what to expect

Hi {{name}},

Looking forward to our call on {{date}}!

Here's what we'll cover (30 min):
1. Quick intro + your QA challenges (5 min)
2. AgentQA demo on a sample repo (10 min)  
3. Live setup on your repo (10 min)
4. Q&A + next steps (5 min)

To make setup smooth, please have ready:
- GitHub org admin access (or someone who does)
- A repo you'd like to test (ideally active, TypeScript)

See you soon!
{{your_name}}
```

---

## Onboarding Call (30 min)

### Intro (5 min)
- [ ] Introductions
- [ ] Confirm their role and team size
- [ ] Ask: "What's your #1 QA pain point right now?"
- [ ] Ask: "What would success look like for this beta?"

### Demo (10 min)
- [ ] Show AgentQA on sample repo
- [ ] Walk through a real bug we caught
- [ ] Explain how the agent analyzes PRs
- [ ] Show the GitHub Action integration
- [ ] Answer initial questions

### Live Setup (10 min)
- [ ] They install GitHub App on their org
- [ ] Select repository to enable
- [ ] Verify connection in AgentQA dashboard
- [ ] Trigger test run on recent PR
- [ ] Confirm results appear

### Wrap-up (5 min)
- [ ] Set expectations for beta period
- [ ] Explain feedback cadence (weekly check-in)
- [ ] Share Slack/Discord invite for support
- [ ] Confirm best contact method
- [ ] Schedule first weekly check-in

---

## Post-Onboarding (Same Day)

- [ ] Send thank you + recap email
- [ ] Add to beta users tracking sheet
- [ ] Add to Slack/Discord support channel
- [ ] Set up monitoring for their repos
- [ ] Create their feedback doc (copy template)
- [ ] Add weekly check-in to calendar

### Post-Call Email Template

```
Subject: You're live on AgentQA! 🚀

Hi {{name}},

Great call today! You're all set up.

Quick recap:
- AgentQA is now watching: {{repo_name}}
- First full analysis will run on your next PR
- Dashboard: app.agentqa.dev

What to expect:
- On each PR, you'll see AgentQA comment with findings
- We'll check in weekly ({{day}}) to get your feedback
- Questions? Drop them in Slack or reply here

Support channel: [Slack invite link]
Docs: docs.agentqa.dev

Thanks for being an early believer. Let's make AgentQA amazing together.

{{your_name}}
```

---

## Week 1 Checklist

- [ ] Monitor their first 3-5 PRs
- [ ] Check for any errors or false positives
- [ ] Proactively reach out if issues detected
- [ ] Prepare for first weekly check-in
- [ ] Note any feature requests or confusion points

---

## Ongoing (Weekly)

- [ ] Conduct weekly check-in (see feedback-template.md)
- [ ] Review their usage metrics
- [ ] Document feedback and bugs
- [ ] Prioritize their feature requests
- [ ] Share product updates

---

## Offboarding (If Needed)

If a beta user needs to leave:

- [ ] Understand reason (not a fit? timing? issues?)
- [ ] Offer to pause instead of remove
- [ ] Get final feedback
- [ ] Remove GitHub App access
- [ ] Thank them for participating
- [ ] Ask if we can follow up when we launch

---

## Tools & Access Needed

**For the setup call:**
- GitHub App installation link
- AgentQA dashboard access
- Sample repo for demo
- Screen sharing ready

**For the beta user:**
- GitHub org admin (or someone to approve App)
- Active TypeScript repo
- 30 minutes for onboarding
- 5 minutes/week for feedback
