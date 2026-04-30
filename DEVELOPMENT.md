# Development Guide

This guide covers local setup, module responsibilities, code standards, and the release process.

## Quick start

```bash
git clone https://github.com/bishalprasad321/prpilot-summary.git
cd prpilot-summary
npm install
npm run build
npm run verify && npm run lint
```

## Project structure

```
prpilot-summary/
├── src/
│   ├── index.ts                 # Main entry point — orchestrator
│   ├── github/
│   │   └── github-client.ts     # GitHub API client
│   ├── diff/
│   │   └── diff-processor.ts    # Diff filtering, chunking, language detection
│   ├── llm/
│   │   └── llm-client.ts        # LLM provider abstraction
│   ├── state/
│   │   └── state-manager.ts     # Idempotency state persistence
│   └── utils/
│       ├── logger.ts            # Structured logging
│       ├── formatter.ts         # Markdown generation and PR body management
│       └── types.ts             # Shared TypeScript interfaces
├── lib/                         # tsc output (generated, gitignored)
├── dist/                        # ncc bundle committed to the repo
├── .github/
│   └── workflows/               # CI/CD workflow files
├── package.json
├── tsconfig.json
├── action.yml
└── README.md
```

## Development workflow

### Making changes

```bash
# 1. Edit files in src/

# 2. Type-check
npm run typecheck

# 3. Lint and fix
npm run lint:fix

# 4. Format
npm run format

# 5. Build
npm run build

# 6. Run tests
npm test
```

### Watch mode

```bash
npm run watch
# Recompiles TypeScript automatically on file changes.
# Does not rebundle dist/ — run npm run build for that.
```

### Debug logging

Set the `DEBUG` environment variable before running:

```bash
export DEBUG=true
npm run dev
```

Or pass `true` to the `Logger` constructor in code:

```typescript
const logger = new Logger(true);
logger.debug("Detailed output here");
```

---

## Module guide

### `index.ts` — orchestrator

Coordinates all modules through a 14-step pipeline. Each step logs its entry and result for traceability. Business logic does not belong here — keep it in the dedicated modules.

Steps:

1. Parse inputs
2. Extract GitHub context
3. Initialize clients
4. Fetch PR metadata
5. State check (idempotency)
6. Diff retrieval
7. Diff processing
8. LLM context preparation
9. LLM execution
10. Output formatting
11. PR body update
12. Push to GitHub
13. State persistence
14. Final logging

### `github-client.ts`

Wraps Octokit for all GitHub API interactions. All methods return data or an empty/null value on error — they never throw.

Key methods:

| Method                                 | Description                          |
| -------------------------------------- | ------------------------------------ |
| `getPullRequest(prNumber)`             | Fetch PR title, body, base/head SHAs |
| `getChangedFiles(prNumber)`            | List files changed in the PR         |
| `getCommits(prNumber)`                 | Get commit history                   |
| `getDiff(prNumber)`                    | Full diff from base to head          |
| `getDiffBetween(baseSha, headSha)`     | Diff between two specific SHAs       |
| `updatePullRequest(prNumber, options)` | Update the PR body                   |
| `commentOnPR(prNumber, message)`       | Post a comment on the PR             |

### `diff-processor.ts`

Filters and prepares raw diff content for LLM consumption.

Key methods:

| Method                                    | Description                             |
| ----------------------------------------- | --------------------------------------- |
| `processAndFilter(files, diff, maxLines)` | Main entry point                        |
| `parseDiff(content)`                      | Parse unified diff into per-file chunks |
| `shouldIgnoreFile(filename)`              | Test filename against ignore patterns   |
| `detectLanguage(filename)`                | Map file extension to language name     |
| `truncateChunks(chunks, maxLines)`        | Reduce chunks to fit within line budget |

**Ignore patterns** (extend as needed):

```typescript
/\.lock$/,
/node_modules\//,
/dist\//,
/build\//,
/\.min\.js$/,
/\.(png|jpg|jpeg|gif|ico|svg|webp|pdf|zip)$/,
```

**Language map** (extend as needed):

```typescript
'.ts': 'typescript',
'.py': 'python',
'.go': 'go',
// etc.
```

**Truncation priority:** modified files first, then added, renamed, removed. Within each group, larger change counts are preferred.

### `llm-client.ts`

Abstracts LLM provider differences. Supports Groq, OpenAI, Gemini, and any OpenAI-compatible endpoint. Provider is resolved automatically from the model name when `provider` is set to `"auto"`.

Key methods:

| Method                 | Description                            |
| ---------------------- | -------------------------------------- |
| `buildPrompt(context)` | Construct the system and user messages |
| `callLLM(messages)`    | Execute the API call with retry logic  |
| `getProvider()`        | Return the resolved provider name      |

**Retry policy:** up to 3 attempts with exponential backoff (1s, 2s, 4s).

**To add a new provider:**

1. Add the provider name to the `LLMProvider` type
2. Add detection logic in `resolveProvider()`
3. Implement the API call in a new private method
4. Route to it in `callLLM()`

### `state-manager.ts`

Persists a small JSON file (`.ai-pr-state.json`) to track the last processed commit SHA and PR number. This ensures idempotency across workflow runs.

**State structure:**

```typescript
{
  lastProcessedSha: string | null;
  processedAt: string; // ISO timestamp
  prNumber: number | null;
}
```

**To extend storage options** (e.g. GitHub artifacts, DynamoDB): implement the same `getLastProcessedSha` / `setLastProcessedSha` / `setPRNumber` interface in a new class and swap it into `index.ts`.

### `formatter.ts`

Converts LLM JSON output to Markdown and manages the PR body structure.

Key public methods:

| Method                                    | Description                                           |
| ----------------------------------------- | ----------------------------------------------------- |
| `toMarkdown(llmOutput)`                   | Convert `LLMOutput` to the AI section Markdown        |
| `replaceAISection(body, content, files?)` | Replace the AI section, preserving all other content  |
| `getAISection(body)`                      | Extract the current AI section (useful for debugging) |

**Section markers:**

```html
<!-- AI:START -->
...AI-generated content...
<!-- AI:END -->
```

**Content preservation logic:**

1. Extract any raw description written before the action first ran
2. Extract existing Developer Notes content
3. Merge the raw description into Developer Notes (raw description goes first if both exist)
4. Generate the checklist based on whether `*.md` files were changed
5. Replace only the AI section; rebuild the template around the preserved content

**Checklist behavior:**

| Files changed   | Checklist item state                     |
| --------------- | ---------------------------------------- |
| Any `*.md` file | `- [x] Documentation updated / modified` |
| No `*.md` files | `- [ ] Documentation updated / modified` |

### `logger.ts`

Provides timestamped, leveled log output.

```typescript
logger.info("General information");
logger.warn("Non-fatal warning");
logger.error("Something went wrong");
logger.debug("Verbose detail (only when debug mode is on)");
logger.success("Step completed successfully");
```

Debug messages are suppressed unless `debugMode` is `true` or `process.env.DEBUG === "true"`.

---

## Types

All shared interfaces live in `src/utils/types.ts`. Key types:

| Type         | Purpose                                                        |
| ------------ | -------------------------------------------------------------- |
| `PRMetadata` | PR title, body, base/head SHAs                                 |
| `CommitInfo` | SHA, message, author, date                                     |
| `FileChange` | Filename, status, addition/deletion counts, patch              |
| `DiffChunk`  | File diff with metadata and detected language                  |
| `LLMContext` | Full input package sent to the LLM                             |
| `LLMOutput`  | Parsed LLM response (summary, keyPoints, highlights, breaking) |

When adding new types, define them in `types.ts`, export them, and import from there.

---

## Testing

### Unit tests

```bash
npm test
npm test -- --coverage
npm test -- --verbose
npm test -- --testPathPattern=formatter
```

Test files live alongside the modules they test (e.g. `src/utils/formatter.test.ts`).

### Manual integration testing

1. Get a Groq API key (free tier, no billing required) from [console.groq.com](https://console.groq.com)
2. Build the action: `npm run build`
3. Create a `.env.test` file:

   ```
   GITHUB_TOKEN=ghp_xxxxx
   LLM_API_KEY=gsk_xxxxx
   GITHUB_REPOSITORY=owner/repo
   LLM_PROVIDER=groq
   AI_MODEL=openai/gpt-oss-120b
   ```

4. Run locally: `npm run dev`

### CI/CD pipeline

The `ci.yml` workflow runs on every push and PR. It type-checks, lints, formats, tests, builds, and verifies the `dist/` bundle. The workflow also checks that the committed `dist/` matches what `npm run build` would produce — so always run the build and commit updated `dist/` before pushing.

### Provider notes for development

| Provider | Free tier | Notes                                          |
| -------- | --------- | ---------------------------------------------- |
| Groq     | Yes       | Recommended for development; OpenAI-compatible |
| Gemini   | Yes       | No billing account required                    |
| OpenAI   | No        | Requires billing account; charges apply        |

---

## Code standards

### TypeScript

Strict mode is always enabled. Never use `any` — use `unknown` with type narrowing or define a proper interface.

```typescript
// Avoid
function process(data: any) {
  return data.foo;
}

// Prefer
interface Data {
  foo: string;
}
function process(data: Data): string {
  return data.foo;
}
```

Always declare return types:

```typescript
async function getValue(): Promise<string> {
  return "value";
}
```

### Naming

- Variables and functions: `camelCase`
- Classes and interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- TypeScript `private` keyword is used for access control — no underscore prefix needed

### Comments

Comment _why_, not _what_. The code already shows what it does.

```typescript
/**
 * Parse diff content into per-file chunks.
 * @param diffContent Raw unified diff output from the GitHub API
 * @returns Array of per-file diff objects
 */
private parseDiff(diffContent: string): Array<{ filename: string; content: string }> {
  // Split on "diff --git" headers rather than "+++ b/" lines
  // because renamed files can produce two "+++ b/" entries.
  ...
}
```

### Error handling

Never throw from a module to the orchestrator. Catch, log, and return an empty/null value.

```typescript
try {
  const data = await api.call();
  return data;
} catch (error) {
  this.logger.error(
    `Failed: ${error instanceof Error ? error.message : String(error)}`
  );
  return null;
}
```

### Logging

Use the `Logger` class. Do not use `console.log` directly in module code.

---

## Performance considerations

- Keep LLM context under 2000 tokens where possible (most models have a 4k–8k context window)
- Use incremental diff for routine PR updates (enabled by default)
- Filter aggressively: lock files, build artifacts, and generated files add noise without value
- For large PRs, consider lowering the token cost by using a faster model (e.g. `openai/gpt-oss-20b` on Groq)
- GitHub's authenticated API rate limit is 5000 requests/hour

---

## Troubleshooting

### `dist/index.js` not found

Run `npm run build`. Check that `tsconfig.json` has `outDir: "./lib"` and that the ncc step succeeds.

### Lint errors

```bash
npm run lint:fix
# Not all issues can be auto-fixed — read the output for manual fixes.
```

### Type errors

```bash
npm run typecheck
# Fix the reported types. Avoid casting to `any`.
```

### Tests failing

```bash
npm test -- --verbose
# Read the assertion messages and update test expectations if behavior was intentionally changed.
```

### Action does not run in CI

1. Verify `dist/index.js` exists — run `npm run build` if missing
2. Check the GitHub Actions run log for error messages
3. Enable `debug: true` in the action inputs for verbose output
4. Use `gh run view --log <RUN_ID>` to inspect logs from the CLI

---

## Release process

1. Update the version in `package.json` and `action.yml`
2. Update `CHANGELOG.md`
3. `git commit -am "chore: release v1.2.3"`
4. `git tag v1.2.3`
5. `git push origin main --tags`
6. Create a GitHub Release from the tag and paste the changelog entry

---

## Further reading

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Octokit REST SDK](https://github.com/octokit/rest.js)
- [Groq API docs](https://console.groq.com/docs/overview)
- [Gemini API docs](https://ai.google.dev/api)
- [OpenAI API reference](https://platform.openai.com/docs/api-reference)
- [TypeScript handbook](https://www.typescriptlang.org/docs/)
