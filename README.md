# 🚀 PR Pilot Summary

**Automate your PR descriptions with AI.** Generate intelligent, context-aware pull request descriptions in seconds. Perfect for busy teams, open-source projects, and anyone who wants clearer PR communication.

Analyzes your code changes and produces meaningful summaries, key points, and insights that help reviewers understand what changed and why.

## Features

✨ **Key Features:**

- 🤖 **AI-Powered Analysis** - Supports OpenAI, Gemini, and OpenAI-compatible models
- 📋 **Complete Template** - Generates professional PR structure with Summary, Developer Notes, and Checklist
- 🛡️ **Smart Content Preservation** - Extracts your existing PR description and preserves it in Developer Notes
- 📝 **Dynamic Checklist** - Auto-generates checklist items based on file types changed (tests, docs, configs, etc.)
- 🔄 **Incremental Processing** - Handles large diffs efficiently
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

### PR Body Template & Content Preservation

The action generates a complete, professional PR template with **intelligent content preservation**:

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

- Your pre-written description automatically preserved here ✅
- Add any extra context

---

## ✅ Checklist

- [x] Tests added (auto-marked if test files changed)
- [x] Documentation updated (auto-marked if docs changed)
- [ ] Configuration validated (added if config files changed)
- [ ] Performance reviewed (added for large diffs >500 changes)
```

**🛡️ Smart Content Preservation:**

- **Pre-written descriptions** - Extracted from initial PR body and moved to Developer Notes ✅
- **AI Section** (`<!-- AI:START -->...<!-- AI:END -->`) - Updated on each PR change
- **Developer Notes** - Your content is **always preserved** ✅
- **Dynamic Checklist** - Auto-generated based on file changes, never loses user edits ✅

**How It Works:**

1. **First Run (Empty Description)**:
   - Creates template with defaults
   - Generates checklist based on files changed

2. **First Run (With User Description)**:
   - Extracts your description
   - Moves it to Developer Notes
   - Generates smart checklist based on file types

3. **User Edits**:
   - Add/edit notes and checklist items freely
   - Modify checklist items as needed

4. **PR Updates**:
   - Only AI section is regenerated
   - Your description and edits stay intact
   - Idempotent: safe to run multiple times

**Dynamic Checklist Examples:**

| File Changed                      | Auto-Generated Items                     |
| --------------------------------- | ---------------------------------------- |
| `__tests__/*.ts` or `*.test.ts`   | ✅ `Tests added` (checked)               |
| `docs/`, `*.md`, `README`         | ✅ `Documentation updated` (checked)     |
| `.json`, `.yml`, `.yaml`, `.toml` | ⬜ `Configuration validated` (added)     |
| 500+ total changes                | ⬜ `Performance reviewed` (added)        |
| 100+ lines deleted                | ⬜ `Breaking changes documented` (added) |

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

#### Recommended: Gemini API (Free Tier Available)

**This project is tested and developed using Gemini API.**

1. **Get Gemini API Key** (free tier available, no billing required):
   - Go to [Google AI Studio](https://aistudio.google.com/apikey)
   - Click "Create API Key"
   - Select "Create new API key in new project" (or existing project)
   - Copy the generated API key
   - Add to your repo secrets as `GEMINI_API_KEY`

2. **In your workflow**, use:
   ```yaml
   llm_provider: gemini
   ai_model: gemini-2.5-flash
   llm_api_key: ${{ secrets.GEMINI_API_KEY }}
   ```

#### Alternative: OpenAI API

⚠️ **Note**: OpenAI API requires a **mandatory billing account** and will charge for API usage even if you only use the free trial initially. Development and testing is done with Gemini due to this cost consideration.

1. Create an OpenAI account on [platform.openai.com](https://platform.openai.com)
2. **Enable billing** on your account (required - will incur charges)
3. Create an API key in your account settings
4. Add it to your repo secrets as `OPENAI_API_KEY`
5. Reference it in your workflow:
   ```yaml
   llm_provider: openai
   ai_model: gpt-4o-mini
   llm_api_key: ${{ secrets.OPENAI_API_KEY }}
   ```

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
