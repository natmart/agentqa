# AgentQA Documentation

> **AI-Powered QA Engineering** — Generate, run, and auto-fix tests until they pass.

Welcome to the AgentQA documentation. This guide covers everything from getting started to advanced CI/CD integration.

---

## 📚 Table of Contents

### Getting Started
- [**Getting Started**](getting-started.md) — Installation, quick start, your first scan
- [**Configuration**](configuration.md) — Understanding `.agentqa.yml` options

### Reference
- [**CLI Reference**](cli-reference.md) — All commands with examples
- [**API Reference**](api-reference.md) — REST API endpoints

### Integration
- [**CI/CD Integration**](ci-cd.md) — GitHub Actions, GitLab CI, Jenkins setup

### Help
- [**Troubleshooting**](troubleshooting.md) — Common issues and solutions

---

## Quick Links

| Task | Command |
|------|---------|
| Install | `npm install -g agentqa` |
| Scan codebase | `agentqa scan ./src` |
| Generate tests | `agentqa generate ./src` |
| Run & heal | `agentqa heal ./src` |
| Start API server | `agentqa serve` |

---

## What is AgentQA?

AgentQA is an autonomous QA engineer for your development team. Unlike traditional test generators, AgentQA:

1. **Scans** your codebase for untested code
2. **Generates** comprehensive tests using AI (GPT-4)
3. **Runs** the tests automatically
4. **Heals** failing tests by analyzing errors and regenerating

The result: 80% test coverage without hiring a QA engineer.

---

## Supported Frameworks

| Framework | Language | Test Pattern |
|-----------|----------|--------------|
| **Vitest** | TypeScript/JavaScript | `*.test.ts`, `*.spec.ts` |
| **Jest** | TypeScript/JavaScript | `*.test.ts`, `*.spec.ts` |
| **Pytest** | Python | `test_*.py`, `*_test.py` |

---

## Need Help?

- 📖 Check the [Troubleshooting Guide](troubleshooting.md)
- 🐛 [Open an issue](https://github.com/natmart/agentqa/issues) on GitHub
- 💬 Join our community discussions

---

<p align="center">
  <strong>AgentQA</strong> — Autonomous QA Engineer for Dev Teams<br>
  <a href="https://github.com/natmart/agentqa">GitHub</a> · 
  <a href="getting-started.md">Get Started →</a>
</p>
