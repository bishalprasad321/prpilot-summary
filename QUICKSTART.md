# 🚀 Quick Start - PR Pilot Summary

Get AI-powered PR descriptions running in 5 minutes.

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
        uses: bishalprasad321/prpilot-summary@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          llm_api_key: ${{ secrets.GROQ_API_KEY }}
          llm_provider: groq
          ai_model: openai/gpt-oss-120b
```

2. Get your Groq API key:
   - Visit the Groq console
   - Create an API key
   - Copy the generated key

3. Add secrets to your repo:
   - Go to `Settings` → `Secrets and variables` → `Actions`
   - Click **"New repository secret"**
   - Name: `GROQ_API_KEY`
   - Value: Paste your Groq API key from step 2
   - Click **"Add secret"**

4. Create a PR and watch the magic happen! ✨

**Alternative Providers**: See [README.md](README.md#api-keys) for Gemini, OpenAI, or other LLM providers

---

## Option 2: Develop Locally

### Prerequisites

- Node.js 20+
- npm

### Setup (2 minutes)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/prpilot-summary.git
cd prpilot-summary

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
3. � Generates complete PR template:
   - Summary section (📌)
   - AI Generated Summary (🤖) with insights
   - Developer Notes (🧑‍💻) - your pre-written description is extracted here!
   - Generic Checklist (✅) - documentation checkbox auto-checked for `*.md` changes
4. 💾 Updates PR description automatically
5. 👀 Reviewers get context instantly
```

### Smart Features

✨ **What makes it special:**

- **If you write a description first**: It gets extracted and moved to "Developer Notes" (not lost!)
- **Generic Checklist**:
  - ✅ Documentation updated / modified (checked only if `*.md` files were modified)
- **Idempotent**: Safe to edit and re-run multiple times
- **Content Preservation**: Your notes and checklist edits never get lost

Example output:

```markdown
## 📌 Summary

<!-- AI:START -->

## 🤖 AI Generated Summary

Refactored authentication to use async/await.
Added token refresh mechanism with 5 min expiry.

**Key Points:**

- Improved performance by 40%
- Better error handling

**Highlights:**

- Zero downtime deployment
- Backward compatible
<!-- AI:END -->

---

## 🧑‍💻 Developer Notes

- Add any extra context here

---

## ✅ Checklist

- [ ] Documentation updated / modified

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
  llm_provider: groq
  ai_model: openai/gpt-oss-120b
  # or
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

- � [Full API Documentation](../docs/api.md)
- 📋 [Template Format Guide](../docs/template.md)
- �💬 [GitHub Discussions](https://github.com/bishalprasad321/prpilot-summary/discussions)
- 🐛 [Report Issues](https://github.com/bishalprasad321/prpilot-summary/issues)
- 📧 Email: bishalprasad321@gmail.com

---

## Give It a Star ⭐

If this helps, please star the repo!

```bash
# Clone, setup, build, done!
git clone https://github.com/bishalprasad321/prpilot-summary.git
cd prpilot-summary
npm install && npm run build
```

Happy coding! 🎉
