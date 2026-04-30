# PR Pilot Summary

Automatically generate context-aware pull request descriptions using AI. Analyzes code diffs, commit history, and file changes to produce structured summaries that help reviewers understand what changed and why.

## Features

✨ **Key Features:**

- 🤖 **AI-Powered Analysis** - Supports Groq, Gemini, OpenAI, and OpenAI-compatible models
- 📋 **Complete Template** - Generates professional PR structure with Summary, Developer Notes, and Checklist
- 🛡️ **Smart Content Preservation** - Extracts your existing PR description and preserves it in Developer Notes
- 📝 **Generic Checklist** - Tracks documentation updates without assuming a specific tech stack
- 🔄 **Incremental Processing** - Handles large diffs efficiently
- ⚡ **Idempotent** - Won't reprocess same commits
- 🎯 **Smart Filtering** - Ignores noise (node_modules, build artifacts, lock files)
- 🌍 **Multi-Language** - Detects 20+ programming languages
- 📊 **Comprehensive** - Summarizes changes, key points, and highlights
- ⏱️ **Timeout Safe** - Graceful error handling, never breaks PR flow

## Installation

Add the following workflow file to your repository at `.github/workflows/pr-description.yml`:

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
          llm_api_key: ${{ secrets.GROQ_API_KEY }}
          llm_provider: groq
          ai_model: openai/gpt-oss-120b
          max_diff_lines: 5000
          enable_incremental_diff_processing: true
```

### Inputs

| Input                                | Required | Default                       | Description                                                                   |
| ------------------------------------ | -------- | ----------------------------- | ----------------------------------------------------------------------------- |
| `github_token`                       | ✅       | `${{ secrets.GITHUB_TOKEN }}` | GitHub token for PR access                                                    |
| `llm_api_key`                        | ✅       | `${{ secrets.LLM_API_KEY }}`  | Provider API key such as Groq, Gemini, or OpenAI                              |
| `llm_provider`                       | ❌       | `auto`                        | Provider routing: `auto`, `groq`, `openai`, `openai-compatible`, `gemini`     |
| `llm_api_base_url`                   | ❌       | `""`                          | Optional custom endpoint for Groq/OpenAI-compatible providers                 |
| `ai_model`                           | ❌       | `openai/gpt-oss-120b`         | Model to use (e.g., `openai/gpt-oss-120b`, `gemini-2.5-flash`, `gpt-4o-mini`) |
| `max_diff_lines`                     | ❌       | `5000`                        | Max diff lines to process before summarizing                                  |
| `enable_incremental_diff_processing` | ❌       | `true`                        | Enable incremental processing on updates                                      |

## Local Development

### Setup

```bash
npm install
npm run build
npm run watch  # auto-recompile on changes
```

### Available commands

```bash
npm run build         # compile TypeScript and bundle to dist/
npm run typecheck     # run tsc without emitting
npm run lint          # run ESLint
npm run lint:fix      # run ESLint with auto-fix
npm run format        # run Prettier
npm run format:check  # check formatting without writing
npm run test          # run Jest
npm run dev           # run with ts-node (no build step)
```

### Packaging

This project follows the standard TypeScript GitHub Action layout:

- `src/` — TypeScript source
- `lib/` — intermediate `tsc` output (gitignored)
- `dist/` — `@vercel/ncc` bundle committed to the repository and used by `action.yml`

Before tagging a release, run `npm run build` and commit the updated `dist/` files.

## Architecture

```
src/
├── index.ts                    # Central orchestrator (14-step pipeline)
├── github/
│   └── github-client.ts        # GitHub API wrapper (Octokit)
├── diff/
│   └── diff-processor.ts       # Diff filtering, chunking, language detection
├── llm/
│   └── llm-client.ts           # Multi-provider LLM client with retry logic
├── state/
│   └── state-manager.ts        # Idempotency state persistence
└── utils/
    ├── logger.ts               # Structured logging
    ├── formatter.ts            # Markdown generation and PR body management
    └── types.ts                # Shared TypeScript interfaces
```

### Execution pipeline

```
1.  Parse inputs
2.  Extract GitHub context
3.  Initialize clients
4.  Fetch PR metadata (title, body, files, commits)
5.  Check state — skip if head SHA already processed
6.  Retrieve diff (full or incremental)
7.  Process diff (filter, chunk, detect language)
8.  Prepare LLM context
9.  Call LLM with retry logic
10. Format output to Markdown
11. Merge new AI section into PR body (preserve developer notes)
12. Push updated body to GitHub
13. Persist state
14. Log summary
```

## How It Works

### Trigger and state check

The action runs on `pull_request` events of type `opened` or `synchronize`. On each run it reads the last processed commit SHA from a local state file. If the current head SHA matches, the action exits early.

### Diff retrieval

On first run, the full diff from base to head is used. On subsequent runs, when `enable_incremental_diff_processing` is `true`, the action fetches both an incremental diff (from last processed SHA) and the full diff, then compares their sizes. If the incremental diff is 30% or more of the full diff, it falls back to the full diff to preserve context.

### Filtering and chunking

The diff processor removes files matching ignore patterns (lock files, `node_modules/`, `dist/`, `build/`, binary formats), detects language by file extension, and truncates chunks if the total line count exceeds `max_diff_lines`, prioritizing modified files over added or removed ones.

### PR body template

The action generates and maintains a structured PR body:

```markdown
## Summary

<!-- AI:START -->

## AI Generated Summary

Summary text, key points, and highlights generated by the LLM.

<!-- AI:END -->

---

## Developer Notes

- Add any extra context here

---

## Checklist

- [x] Documentation updated / modified (auto-marked only when `*.md` files changed)
```

On each run, only the content between `<!-- AI:START -->` and `<!-- AI:END -->` is replaced. Everything else is preserved.

- **Pre-written descriptions** - Extracted from initial PR body and moved to Developer Notes ✅
- **AI Section** (`<!-- AI:START -->...<!-- AI:END -->`) - Updated on each PR change
- **Developer Notes** - Your content is **always preserved** ✅
- **Generic Checklist** - Auto-generated from project-agnostic signals, never loses user edits ✅

| Scenario                                    | Result                                              |
| ------------------------------------------- | --------------------------------------------------- |
| PR opened with no description               | Template created with defaults                      |
| PR opened with a user-written description   | Description extracted and placed in Developer Notes |
| PR updated after user edits Developer Notes | User edits preserved; only AI section regenerated   |
| `*.md` files changed                        | Documentation checklist item marked as checked      |
| No `*.md` files changed                     | Documentation checklist item left unchecked         |

1. **First Run (Empty Description)**:
   - Creates template with defaults
   - Generates checklist based on markdown files changed

2. **First Run (With User Description)**:
   - Extracts your description
   - Moves it to Developer Notes
   - Generates generic checklist based on markdown files

3. **User Edits**:
   - Add/edit notes and checklist items freely
   - Modify checklist items as needed

4. **PR Updates**:
   - Only AI section is regenerated
   - Your description and edits stay intact
   - Idempotent: safe to run multiple times

**Generic Checklist Behavior:**

| File Changed | Auto-Generated Item |
| ------------ | ------------------- |
| `*.md`       | ✅ `Documentation updated / modified` |
| Anything else | ⬜ `Documentation updated / modified` |

## Example Output

```markdown
## AI Generated Summary

Refactored the authentication module to use async/await throughout.
Added an automatic token refresh mechanism with a 5-minute expiry window.

**Key Points:**

- Converted callback-based API calls to Promise-based approach
- Added exponential backoff for failed API calls
- Updated all 12 authentication tests

**Highlights:**

- Token refresh reduces 401 errors by 95%
- Rate limiting added to prevent brute-force attempts

> **Breaking change:** OAuth 1.0 support has been removed (deprecated two years ago).
```

## Error handling

If any step fails, the action posts a comment on the PR and exits without modifying the PR body. Specific behaviors:

- **LLM API error** — posts an error comment, sets the action status to failed
- **GitHub API error** — logs the error, does not attempt to update the PR
- **Parse error** — skips the affected diff chunk, continues with the rest
- **State error** — falls back to full diff mode

## Costs and performance

- **Cost**: Varies by provider and model; Groq free-tier usage is available
- **Speed**: 5-15 seconds typical (depends on diff size)
- **Max Diff**: 5000 lines (can be adjusted with `max_diff_lines`)

## Configuration

### Model selection

```yaml
steps:
  - name: Generate AI PR Description
    uses: bishalprasad321/prpilot-summary@v1
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
      llm_api_key: ${{ secrets.GROQ_API_KEY }}
      llm_provider: groq
      debug: true # Logs full context, prompts, responses
```

Debug logs include:

- Full context object sent to LLM
- Raw LLM responses
- Formatted Markdown
- Updated PR body

### Model Selection

```yaml
# Groq
llm_provider: groq
ai_model: openai/gpt-oss-120b

# OpenAI
llm_provider: openai
ai_model: gpt-4o-mini

# Gemini
llm_provider: gemini
ai_model: gemini-2.5-flash

# Auto-detect from model name prefix
ai_model: gemini-2.5-flash

# Custom OpenAI-compatible endpoint
llm_provider: openai-compatible
llm_api_base_url: https://your-endpoint.example.com/v1/chat/completions
ai_model: your-model-name
```

### Debug mode

Set `debug: true` to log the full LLM context, raw responses, and the final PR body:

```yaml
- name: Generate AI PR Description
  uses: bishalprasad321/prpilot-summary@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    llm_api_key: ${{ secrets.GROQ_API_KEY }}
    llm_provider: groq
    debug: true
```

## API keys

### GitHub token

#### Recommended: Groq API (Free Tier Available)

Groq is the default provider path for new setups. The default model is `openai/gpt-oss-120b`, selected from Groq production models for its strong quality, 131k context window, and large 65k max completion limit.

1. Create a Groq account and API key from the Groq console.
2. Add it to your repo secrets as `GROQ_API_KEY`.
3. Reference it in your workflow:
   ```yaml
   llm_provider: groq
   ai_model: openai/gpt-oss-120b
   llm_api_key: ${{ secrets.GROQ_API_KEY }}
   ```

#### Gemini API (Free Tier Available)

Gemini remains fully supported and is covered by the existing Gemini integration workflow.

### Groq (recommended, free tier available)

The default model is `openai/gpt-oss-120b`, chosen for its 131k context window and 65k max completion limit.

1. Create an account and API key at [console.groq.com](https://console.groq.com)
2. Add the key to your repository secrets as `GROQ_API_KEY`

### Gemini (free tier available)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key
2. Add it to your repository secrets as `GEMINI_API_KEY`
3. Set `llm_provider: gemini` and `ai_model: gemini-2.5-flash` in your workflow

### OpenAI

> **Note:** OpenAI requires a billing account. API usage will incur charges.

1. Create an account at [platform.openai.com](https://platform.openai.com) and enable billing
2. Create an API key and add it to your repository secrets as `OPENAI_API_KEY`
3. Set `llm_provider: openai` and choose a model such as `gpt-4o-mini`

## Contributing

```bash
# Fork and clone, then:
npm install
npm run build && npm run lint

# Make your changes, then:
git commit -m "feat: describe your change"
git push
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide and [DEVELOPMENT.md](DEVELOPMENT.md) for architecture details.

## Troubleshooting

| Error                     | Likely cause                            | Fix                                                |
| ------------------------- | --------------------------------------- | -------------------------------------------------- |
| "Missing required inputs" | `github_token` or `llm_api_key` not set | Check repository secrets                           |
| "LLM API error 401"       | Invalid or mismatched API key           | Verify the key matches the selected provider       |
| "No meaningful changes"   | Diff is empty or all files are filtered | Check that source files are not in the ignore list |
| "State file not found"    | First run in this environment           | Expected; the action will create the state file    |
| "Diff exceeds max lines"  | PR is very large                        | Increase `max_diff_lines` or split the PR          |

## License

MIT © Bishal Prasad

## Support

- [GitHub Issues](https://github.com/bishalprasad321/prpilot-summary/issues)
- [Discussions](https://github.com/bishalprasad321/prpilot-summary/discussions)
- Email: bishalprasad321@gmail.com
