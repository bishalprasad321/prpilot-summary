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

### Step 2 — Get a Groq API key

1. Go to [console.groq.com](https://console.groq.com) and create an account
2. Generate an API key
3. Copy the key

### Step 3 — Add the secret to your repository

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `GROQ_API_KEY`, Value: the key from step 2
4. Click **Add secret**

### Step 4 — Open a pull request

Create or update a PR and the action will run automatically.

**Alternative providers:** See [README.md](README.md#api-keys) for Gemini, OpenAI, and other options.

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

1. The action reads the current diff and commit messages
2. It sends filtered, chunked diff content to the configured LLM
3. The LLM returns a structured summary
4. The PR body is updated with the following sections:
   - **Summary** — top-level section header
   - **AI Generated Summary** — LLM-generated content (replaced on each run)
   - **Developer Notes** — preserved across runs; pre-written descriptions are moved here automatically
   - **Checklist** — a single documentation item, auto-checked when `*.md` files are modified
5. State is persisted so the same commit is never processed twice

### Key behaviors

- If you write a description before the action runs, it is extracted and placed in Developer Notes — nothing is lost
- The `<!-- AI:START -->` / `<!-- AI:END -->` markers delimit the only section the action ever modifies
- All other content in the PR body is left untouched

### Example PR body

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
```

---

## Configuration

### Switching providers

```yaml
with:
  llm_provider: groq
  ai_model: openai/gpt-oss-120b

  # or Gemini
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
