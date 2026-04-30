# Quick Start

Get AI-generated PR descriptions running in a few minutes.

## Option 1: Use as a GitHub Action (recommended)

### Step 1 — Add the workflow file

Create `.github/workflows/pr-description.yml` in your repository:

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

### Step 3 — Add the secret to your repository

**Alternative Providers**: See [README.md](README.md#api-keys) for Gemini, OpenAI, or other LLM providers

---

## Option 2: Develop locally

### Prerequisites

- Node.js 20 or later
- npm

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/prpilot-summary.git
cd prpilot-summary
npm install
npm run build
npm run verify
```

### Development commands

```bash
npm run build         # compile TypeScript and bundle to dist/
npm run watch         # watch mode, recompiles on file changes
npm run lint          # run ESLint
npm run format        # run Prettier
npm run typecheck     # type-check without emitting
npm run dev           # run directly with ts-node
```

---

## What the action does

When a PR is opened or updated:

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

### Key behaviors

- If you write a description before the action runs, it is extracted and placed in Developer Notes — nothing is lost
- The `<!-- AI:START -->` / `<!-- AI:END -->` markers delimit the only section the action ever modifies
- All other content in the PR body is left untouched

- **If you write a description first**: It gets extracted and moved to "Developer Notes" (not lost!)
- **Generic Checklist**:
  - ✅ Documentation updated / modified (checked only if `*.md` files were modified)
- **Idempotent**: Safe to edit and re-run multiple times
- **Content Preservation**: Your notes and checklist edits never get lost

Example output:

```markdown
## Summary

<!-- AI:START -->

## AI Generated Summary

Refactored authentication to use async/await.
Added token refresh with a 5-minute expiry.

**Key Points:**

- Improved error handling
- Reduced 401 errors by 95%

**Highlights:**

- Zero-downtime deployment
- Backward compatible
<!-- AI:END -->

---

## Developer Notes

- Add any extra context here

---

## Checklist

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

### Switching providers

```yaml
with:
  llm_provider: groq
  ai_model: openai/gpt-oss-120b
  # or
  llm_provider: gemini
  ai_model: gemini-2.5-flash

  # or OpenAI
  llm_provider: openai
  ai_model: gpt-4o-mini

  # or let the action detect provider from the model name
  ai_model: gemini-2.5-flash
```

### Adjusting the diff size limit

```yaml
with:
  max_diff_lines: 5000 # default; increase for large PRs
```

### Enabling verbose logs

```yaml
with:
  debug: true
```

---

## Troubleshooting

| Problem                   | Solution                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| "Missing required inputs" | Add your provider API key to repository secrets and pass it to `llm_api_key` |
| "Action didn't run"       | Check the trigger: `types: [opened, synchronize]`                            |
| "No changes to document"  | The diff may be empty or all changed files are filtered out                  |
| "Diff too large"          | Increase `max_diff_lines` or split the PR into smaller pieces                |
| "API error 401"           | Verify the API key is valid and matches the selected `llm_provider`          |

For more detail see [README.md](README.md#troubleshooting).

---

## Next steps

- [README.md](README.md) — full reference documentation
- [DEVELOPMENT.md](DEVELOPMENT.md) — architecture and module guide
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution guidelines
- [CHANGELOG.md](CHANGELOG.md) — version history

---

## Estimated costs

| Volume     | Estimated cost |
| ---------- | -------------- |
| 1,000 PRs  | ~$5            |
| 10,000 PRs | ~$50           |

Actual cost depends on the provider, model, and average diff size.

---

## Support

- [GitHub Issues](https://github.com/bishalprasad321/prpilot-summary/issues)
- [GitHub Discussions](https://github.com/bishalprasad321/prpilot-summary/discussions)
- Email: bishalprasad321@gmail.com
