# 🚀 PR Pilot Summary

**Automate your PR descriptions with AI.** Generate intelligent, context-aware pull request descriptions in seconds. Perfect for busy teams, open-source projects, and anyone who wants clearer PR communication.

Analyzes your code changes and produces meaningful summaries, key points, and insights that help reviewers understand what changed and why.

## Features

✨ **Key Features:**

- 🤖 **AI-Powered Analysis** - Supports OpenAI, Gemini, and OpenAI-compatible models
- 🔄 **Incremental Processing** - Handles large diffs efficiently
- 🛡️ **Safe Updates** - Never overwrites developer notes
- ⚡ **Idempotent** - Won't reprocess same commits
- 🎯 **Smart Filtering** - Ignores noise (node_modules, build artifacts, lock files)
- 🌍 **Multi-Language** - Detects 20+ programming languages
- 📊 **Comprehensive** - Summarizes changes, key points, and highlights
- ⏱️ **Timeout Safe** - Graceful error handling, never breaks PR flow

## Installation

### As a GitHub Action

Add to your `.github/workflows/pr.yml`:

```yaml
name: Generate PR Description

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  generate-description:
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
          llm_api_key: ${{ secrets.GEMINI_API_KEY }}
          llm_provider: gemini
          ai_model: gemini-2.5-flash
          max_diff_lines: 5000
          enable_incremental_diff_processing: true
```

### Inputs

| Input                                | Required | Default                       | Description                                                                     |
| ------------------------------------ | -------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `github_token`                       | ✅       | `${{ secrets.GITHUB_TOKEN }}` | GitHub token for PR access                                                      |
| `llm_api_key`                        | ✅       | `${{ secrets.LLM_API_KEY }}`  | Provider API key such as OpenAI or Gemini                                       |
| `llm_provider`                       | ❌       | `auto`                        | Provider routing: `auto`, `openai`, `openai-compatible`, `gemini`               |
| `llm_api_base_url`                   | ❌       | `""`                          | Optional custom endpoint for OpenAI-compatible providers                        |
| `ai_model`                           | ❌       | `gpt-4o-mini`                 | Model to use (e.g., `gpt-4o-mini`, `gemini-2.5-flash`, custom compatible model) |
| `max_diff_lines`                     | ❌       | `5000`                        | Max diff lines to process before summarizing                                    |
| `enable_incremental_diff_processing` | ❌       | `true`                        | Enable incremental processing on updates                                        |

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Build and bundle the action
npm run build

# Watch mode (auto-recompile on changes)
npm run watch
```

### Commands

```bash
# Build and bundle into dist/
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check

# Development with ts-node
npm run dev
```

### Packaging

This project uses the standard TypeScript GitHub Action layout:

- `src/` contains the TypeScript source
- `lib/` contains intermediate `tsc` output
- `dist/` contains the committed `@vercel/ncc` bundle used by `action.yml`

Before tagging or publishing the action, run `npm run build` and commit the updated `dist/` files.

## Architecture

```
src/
├── index.ts                    # Central orchestrator (14-step flow)
├── github/
│   └── github-client.ts        # GitHub API wrapper (Octokit)
├── diff/
│   └── diff-processor.ts       # Diff filtering, chunking, language detection
├── llm/
│   └── llm-client.ts           # Multi-provider LLM integration with retry logic
├── state/
│   └── state-manager.ts        # Idempotency state persistence
└── utils/
    ├── logger.ts               # Structured logging
    ├── formatter.ts            # Markdown formatting & PR body updates
    └── types.ts                # Shared TypeScript interfaces
```

### Execution Flow

```
1. Parse Inputs
2. Extract GitHub Context
3. Initialize Clients
4. Fetch PR Metadata
5. Check State (idempotency) ⚡
6. Retrieve Diff (full or incremental)
7. Process Diff (filter, chunk, detect language)
8. Prepare Context for LLM
9. Call LLM (with retry logic)
10. Format Output to Markdown
11. Safe PR Update (preserve developer notes)
12. Push to GitHub
13. Persist State
14. Final Logging
```

## How It Works

### Step-by-Step

1. **Trigger**: Action runs on PR `opened` or `synchronize` events
2. **State Check**: Verifies if commit was already processed (prevents duplicates)
3. **Diff Retrieval**:
   - First run: Gets full diff from base to head
   - Subsequent runs: Gets incremental diff from last processed SHA
4. **Intelligent Filtering**:
   - Removes lock files, node_modules, build artifacts, binaries
   - Detects 20+ programming languages
   - Prioritizes meaningful code files
5. **LLM Analysis**: Sends filtered diff + commit messages to the configured LLM provider
6. **Safe Merge**: Updates only the AI section in PR body:
   - Preserves "Developer Notes" and other sections
   - Uses HTML markers: `<!-- AI:START -->...<!-- AI:END -->`
7. **State Persistence**: Saves current SHA to prevent reprocessing

### PR Body Template

```markdown
## 📌 Summary

<!-- AI:START -->

## 🤖 AI Generated Summary

- Summary of changes
- Key points
- Highlights
<!-- AI:END -->

---

## 🧑‍💻 Developer Notes

- Any custom notes you want to add

---

## ✅ Checklist

- [ ] Tests added
- [ ] Documentation updated
```

## Example Output

```markdown
## 🤖 AI Generated Summary

### Summary

Refactored authentication module to use async/await instead of callbacks.
Added token refresh mechanism and improved error handling with comprehensive
retry logic.

### Key Points

- Converted callback-based API calls to Promise-based approach
- Added automatic token refresh with 5-minute expiry check
- Implemented exponential backoff for failed API calls
- Updated all 12 authentication tests to cover new scenarios

### Highlights

- Performance: Token refresh reduces 401 errors by 95%
- Security: Added rate limiting to prevent brute force attempts
- DX: Cleaner code with async/await improves maintainability

⚠️ **BREAKING CHANGES** - OAuth1.0 support removed (deprecated 2 years ago)
```

## Error Handling

The action **never breaks your PR**. If anything fails:

1. **LLM API Error** → Posts comment on PR, exits gracefully
2. **GitHub API Error** → Logs error, doesn't update PR
3. **Parsing Error** → Filters out bad chunks, continues processing
4. **State Error** → Falls back to full diff, continues

## Costs & Performance

- **Cost**: ~$0.005 per PR (using gpt-4o-mini)
- **Speed**: 5-15 seconds typical (depends on diff size)
- **Max Diff**: 5000 lines (can be adjusted with `max_diff_lines`)

## Configuration

### Debug Mode

Enable debug logging:

```yaml
steps:
  - name: Generate AI PR Description
    uses: bishalprasad321/prpilot-summary@v1
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
      llm_api_key: ${{ secrets.GEMINI_API_KEY }}
      llm_provider: gemini
      debug: true # Logs full context, prompts, responses
```

Debug logs include:

- Full context object sent to LLM
- Raw LLM responses
- Formatted Markdown
- Updated PR body

### Model Selection

```yaml
# OpenAI
llm_provider: openai
ai_model: gpt-4o-mini

# Gemini
llm_provider: gemini
ai_model: gemini-2.5-flash

# Auto-detect from model prefix
ai_model: gemini-2.5-flash

# OpenAI-compatible endpoint
llm_provider: openai-compatible
llm_api_base_url: https://your-endpoint.example.com/v1/chat/completions
ai_model: your-model-name
```

## API Keys

### GitHub Token

Uses default `${{ secrets.GITHUB_TOKEN }}` with permissions:

- `pull-requests: write` - Update PR body
- `contents: read` - Read PR changes

### LLM API Key

1. Create a provider key for the model you want to use.
2. Add it to your repo secrets, for example `OPENAI_API_KEY` or `GEMINI_API_KEY`.
3. Reference it through `llm_api_key` in your workflow.

## Contributing

```bash
# Install dev dependencies
npm install

# Make changes
# Test locally
npm run build && npm run lint

# Commit & push
git commit -m "feat: description"
git push
```

## Troubleshooting

| Issue                           | Solution                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------- |
| "Missing required inputs"       | Check `github_token` and `llm_api_key` in secrets                                 |
| "LLM API error 401"             | Verify the configured provider API key is valid and matches the selected provider |
| "No meaningful changes"         | PR diff is probably empty or all files are ignored                                |
| "State file not found"          | First run; expected behavior                                                      |
| "Diff exceeds max lines"        | Increase `max_diff_lines` or split PR into smaller PRs                            |
| "Only generated .gitkeep files" | Check that src directory structure is complete                                    |

## License

MIT © Bishal Prasad

## Support

- 📖 [GitHub Issues](https://github.com/bishalprasad321/prpilot-summary/issues)
- 💬 [Discussions](https://github.com/bishalprasad321/prpilot-summary/discussions)
- 📧 Email: bishalprasad321@gmail.com
