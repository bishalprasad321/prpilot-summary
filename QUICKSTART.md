# 🚀 Quick Start Guide

Get the AI PR Description Generator running in 5 minutes.

## Option 1: Use as GitHub Action (Recommended)

### In Your Workflow

1. Create `.github/workflows/pr-description.yml`:

```yaml
name: Generate PR Description

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  generate:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Generate AI PR Description
        uses: bishal-pdMSFT/action-agentic-pr-doc@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          llm_api_key: ${{ secrets.GEMINI_API_KEY }}
          llm_provider: gemini
          ai_model: gemini-2.5-flash
```

2. Add secrets to your repo:
   - Go to `Settings` → `Secrets and variables` → `Actions`
   - Add `GEMINI_API_KEY` or another provider key and pass it to `llm_api_key`

3. Create a PR and watch the magic happen! ✨

---

## Option 2: Develop Locally

### Prerequisites

- Node.js 20+
- npm

### Setup (2 minutes)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/action-agentic-pr-doc.git
cd action-agentic-pr-doc

# 2. Install
npm install

# 3. Build and package the action
npm run build

# 4. Verify
npm run verify
```

### Development Commands

```bash
npm run build         # Compile TypeScript and bundle dist/
npm run watch        # Auto-compile on changes
npm run lint         # Check code quality
npm run format       # Auto-format code
npm run typecheck    # Full type check
npm run dev          # Run with ts-node
```

---

## What Happens

When you create/update a PR:

```
1. ✅ PR opened/updated
2. 🤖 AI analyzes the changes
3. 📝 Generates summary, key points, highlights
4. 💾 Updates PR description automatically
5. 👀 Reviewers get context instantly
```

Example output:

```markdown
## 🤖 AI Generated Summary

Refactored authentication to use async/await.
Added token refresh mechanism with 5 min expiry.

### Key Points

- Converted callbacks to Promises
- Added automatic token refresh
- 95% reduction in 401 errors

### Highlights

- Better code maintainability
- Enhanced security with rate limiting
```

---

## Configuration

### Model Selection

Change in your workflow:

```yaml
with:
  llm_provider: gemini
  ai_model: gemini-2.5-flash
  # or
  llm_provider: openai
  ai_model: gpt-4o-mini
  # or let the action infer the provider from the model name
  ai_model: gemini-2.5-flash
```

### Max Diff Size

```yaml
with:
  max_diff_lines: 5000 # Default
  # Increase for large PRs, decrease to save costs
```

### Debug Mode

```yaml
with:
  debug: true # Logs everything
```

---

## Troubleshooting

| Problem                   | Solution                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| "Missing required inputs" | Add your provider API key to repo secrets and pass it to `llm_api_key` |
| "Action didn't run"       | Check PR trigger: `types: [opened, synchronize]`                       |
| "No changes to document"  | PR diff might be empty or all files ignored                            |
| "Diff too large"          | Increase `max_diff_lines` or split PR                                  |
| "API error 401"           | Check the provider key is valid and matches `llm_provider`             |

See [README.md](README.md#troubleshooting) for more.

---

## Next Steps

- 📖 Read [README.md](README.md) for full docs
- 👨‍💻 See [DEVELOPMENT.md](DEVELOPMENT.md) for architecture
- 🤝 Check [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- 📝 Review [CHANGELOG.md](CHANGELOG.md) for updates

---

## Costs

- **Per PR**: Varies by provider and model
- **1000 PRs**: ~$5
- **10,000 PRs**: ~$50

Prices vary based on model and diff size.

---

## Support

- 💬 [GitHub Discussions](https://github.com/bishalprasad321/action-agentic-pr-doc/discussions)
- 🐛 [Report Issues](https://github.com/bishalprasad321/action-agentic-pr-doc/issues)
- 📧 Email: bishalprasad321@gmail.com

---

## Give It a Star ⭐

If this helps, please star the repo!

```bash
# Clone, setup, build, done!
git clone https://github.com/bishalprasad321/action-agentic-pr-doc.git
cd action-agentic-pr-doc
npm install && npm run build
```

Happy coding! 🎉
