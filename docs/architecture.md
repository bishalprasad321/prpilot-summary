# Architecture Overview

## System design

PR Pilot Summary follows a modular, layered architecture. The central orchestrator (`index.ts`) coordinates a fixed pipeline of steps, each delegated to a dedicated module. No business logic lives in the orchestrator itself.

```
                    GitHub Actions trigger
                  (pull_request: opened/synchronize)
                              |
                    +---------v----------+
                    |   Orchestrator     |
                    |   (index.ts)       |
                    +---------+----------+
                              |
          +-------------------+-------------------+
          |                   |                   |
   +------v------+    +-------v------+    +-------v------+
   | GitHub      |    | Diff         |    | LLM          |
   | Client      |    | Processor    |    | Client       |
   |             |    |              |    |              |
   | Fetch PR    |    | Parse diff   |    | Build prompt |
   | Get files   |    | Filter files |    | Call API     |
   | Get commits |    | Chunk output |    | Parse JSON   |
   | Update body |    | Detect lang  |    | Retry logic  |
   +------+------+    +-------+------+    +-------+------+
          |                   |                   |
          +-------------------+-------------------+
                              |
                    +---------v----------+
                    |   Formatter        |
                    |                   |
                    | JSON -> Markdown  |
                    | Replace AI section|
                    | Preserve content  |
                    +---------+---------+
                              |
                    +---------v----------+
                    |  State Manager     |
                    |                   |
                    | Track SHA         |
                    | Ensure idempotency|
                    +---------+---------+
                              |
                    +---------v----------+
                    |  GitHub API update |
                    | (updatePullRequest)|
                    +--------------------+
```

## Core modules

### Orchestrator (`src/index.ts`)

Owns the 14-step pipeline. Each step is numbered in comments and logs its entry and result. The orchestrator should not contain business logic — it delegates everything.

Steps:

1. Parse inputs
2. Extract GitHub context
3. Initialize clients
4. Fetch PR metadata
5. State check — exit if SHA already processed
6. Diff retrieval — full or incremental
7. Diff processing — filter, chunk, detect language
8. LLM context preparation
9. LLM execution
10. Output formatting
11. PR body update — merge new AI section
12. Push to GitHub
13. Persist state
14. Final logging

### GitHub Client (`src/github/github-client.ts`)

Wraps Octokit. All methods return data or null/empty on error — they never throw.

| Method                       | Description                          |
| ---------------------------- | ------------------------------------ |
| `getPullRequest(n)`          | Fetch PR title, body, base/head SHAs |
| `getChangedFiles(n)`         | List files changed in the PR         |
| `getCommits(n)`              | Get commit history                   |
| `getDiff(n)`                 | Full diff from base to head          |
| `getDiffBetween(base, head)` | Diff between two specific SHAs       |
| `updatePullRequest(n, opts)` | Update the PR body                   |
| `commentOnPR(n, msg)`        | Post a comment                       |

### Diff Processor (`src/diff/diff-processor.ts`)

Prepares raw diff content for LLM consumption.

**Filtering** — files matching any ignore pattern are dropped:

```
*.lock, node_modules/, dist/, build/, *.min.js, binary formats (.png, .jpg, .pdf, .zip, …)
```

**Language detection** — maps file extension to a language name string (e.g. `.ts` → `"typescript"`).

**Truncation** — when total line count exceeds `maxDiffLines`, chunks are sorted by priority (modified > added > renamed > removed, then by change size) and trimmed to fit.

### LLM Client (`src/llm/llm-client.ts`)

Abstracts provider differences. Supports Groq, OpenAI, Gemini, and any OpenAI-compatible endpoint. When `provider` is `"auto"`, the provider is inferred from the model name prefix.

- **Retry policy:** up to 3 attempts with exponential backoff (1s, 2s, 4s between attempts)
- **JSON repair:** attempts to extract valid JSON from fenced code blocks or partial responses before failing
- **Gemini-specific:** uses the `responseSchema` field in `generationConfig` to enforce structured output and sets `thinkingBudget: 0` to avoid latency from chain-of-thought tokens

### Formatter (`src/utils/formatter.ts`)

Converts the LLM `LLMOutput` object to Markdown and manages the PR body template.

**Template structure:**

```markdown
## Summary

<!-- AI:START -->

## AI Generated Summary

...

<!-- AI:END -->

---

## Developer Notes

...

---

## Checklist

- [ ] Documentation updated / modified
```

**Content preservation logic on each run:**

1. Extract any raw description that existed before the first run
2. Extract existing Developer Notes
3. Merge: raw description prepended to Developer Notes (raw description wins if both exist)
4. Generate checklist based on `*.md` file presence in the changed file list
5. Replace only the content between `<!-- AI:START -->` and `<!-- AI:END -->`
6. Rebuild the full template with the preserved content in place

**Checklist generation:**

| Condition                            | Item state                               |
| ------------------------------------ | ---------------------------------------- |
| At least one `*.md` file in the diff | `- [x] Documentation updated / modified` |
| No `*.md` files                      | `- [ ] Documentation updated / modified` |

### State Manager (`src/state/state-manager.ts`)

Reads and writes a small JSON file (`.ai-pr-state.json`) to the working directory. Tracked fields:

```typescript
{
  lastProcessedSha: string | null;
  processedAt: string; // ISO 8601
  prNumber: number | null;
}
```

If the head commit SHA matches `lastProcessedSha`, the orchestrator exits early. This prevents duplicate processing when the workflow is re-triggered without new commits.

### Logger (`src/utils/logger.ts`)

Provides timestamped, leveled output to stdout/stderr. Debug messages are suppressed unless `debugMode` is `true` or `process.env.DEBUG === "true"`.

---

## Data flow

```
1. GitHub sends webhook
   |
2. Action reads inputs (tokens, provider, model, limits)
   |
3. Fetch PR: title, body, commits, changed files
   |
4. State check: has this SHA been processed?
   +-- Yes --> exit (idempotent)
   +-- No  --> continue
   |
5. Choose diff mode:
   +-- First run             --> full diff (base..head)
   +-- Subsequent, small delta --> incremental diff (lastSHA..head)
   +-- Subsequent, large delta --> fall back to full diff (>= 30% threshold)
   |
6. Process diff:
   - Parse into per-file chunks
   - Filter ignored files
   - Detect language
   - Truncate to maxDiffLines
   |
7. Prepare LLM context:
   - Filtered chunks
   - Commit messages (up to 10)
   - Repository metadata
   - PR statistics
   |
8. Call LLM (with retry):
   - System + user prompt
   - Expect JSON: { summary, keyPoints, highlights, breaking }
   |
9. Format: JSON --> Markdown AI section
   |
10. Merge into PR body:
    - Preserve Developer Notes and Checklist
    - Replace AI:START..AI:END content only
    |
11. Update PR via GitHub API
    |
12. Save state: write new SHA to .ai-pr-state.json
    |
13. Done
```

---

## Configuration surface

All inputs are passed through the action's `with:` block and resolved in step 1:

```typescript
{
  githubToken: string;
  llmApiKey: string;
  llmProvider: "auto" | "groq" | "openai" | "openai-compatible" | "gemini";
  llmApiBaseUrl?: string;
  aiModel: string;
  maxDiffLines: number;                    // default: 5000
  enableIncrementalDiffProcessing: boolean; // default: true
  debug: boolean;                          // default: false
}
```

---

## Testing strategy

### Unit tests

Cover the three most complex modules:

- `DiffProcessor` — filtering logic, truncation priority, language detection
- `Formatter` — Markdown generation, section replacement, content extraction edge cases
- `StateManager` — persistence, reload, reset, corrupt-file recovery

### Integration tests

Handled by `action-test.yml` and `action-test-groq.yml` workflows. These run the full action against a real PR when the corresponding API key secret is present.

### Coverage targets

- Core logic: 80%+ line coverage
- All happy paths and primary error paths tested
- Edge cases: empty diff, missing state file, malformed LLM response, corrupt PR body

---

## Security

- GitHub token permissions are scoped to `pull-requests: write` and `contents: read`
- LLM API keys are stored in GitHub Actions secrets, never logged
- Diff content is sent to the configured LLM provider — consider data sensitivity before enabling on private repositories
- The `dist/` bundle is committed to the repository; verify its integrity before upgrading

---

## Deployment

The action is distributed as a committed `dist/index.js` bundle produced by `@vercel/ncc`. This bundles all dependencies into a single file, which GitHub Actions executes directly using Node.js 20.

Before each release:

1. Run `npm run build`
2. Commit the updated `dist/` directory
3. Tag and publish the release
