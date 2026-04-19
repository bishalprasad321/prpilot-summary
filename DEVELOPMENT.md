# Development Guide

This guide covers setting up the project for development, architecture details, and how to contribute.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/bishalprasad321/prpilot-summary.git
cd prpilot-summary
npm install

# 2. Build and package
npm run build

# 3. Verify
npm run verify && npm run lint
```

## Project Structure

```
prpilot-summary/
├── src/
│   ├── index.ts                 # Main entry point - orchestrator
│   ├── github/
│   │   └── github-client.ts     # GitHub API client
│   ├── diff/
│   │   └── diff-processor.ts    # Diff analysis
│   ├── llm/
│   │   └── llm-client.ts        # LLM integration
│   ├── state/
│   │   └── state-manager.ts     # State persistence
│   └── utils/
│       ├── logger.ts            # Logging utilities
│       ├── formatter.ts         # Markdown formatting
│       └── types.ts             # TypeScript types
├── lib/                         # TypeScript compiler output (generated)
├── dist/                        # Bundled action checked into git (generated)
├── .github/
│   ├── agents/                  # Custom agents
│   ├── workflows/               # CI/CD workflows
│   └── instructions/            # Workspace instructions
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── .eslintrc.json               # Linting rules
├── .prettierrc                  # Code formatting
├── action.yml                   # Action metadata
└── README.md                    # User documentation
```

## Development Workflow

### Code Changes

```bash
# 1. Make changes to src/

# 2. Type check
npm run typecheck

# 3. Lint & fix
npm run lint:fix

# 4. Format
npm run format

# 5. Build and package
npm run build

# 6. Test (if you added tests)
npm run test
```

### Watch Mode

For faster development iteration:

```bash
npm run watch
# Automatically recompiles on file changes
```

### Debugging

Enable debug output:

```bash
# In your test environment
export DEBUG=true

npm run dev
```

Or add debug logs in code:

```typescript
const logger = new Logger(true); // Enable debug mode
logger.debug("Detailed information here");
```

## Module Guide

### index.ts - The Orchestrator

**Responsibility**: Coordinate all modules through 14 steps.

**Key Pattern**: Each step logs entry/exit with emojis for visibility:

```typescript
logger.info("📋 [STEP 1] Parsing inputs...");
// ... do work ...
logger.info("✓ Inputs validated");
```

**Don't**: Add business logic here. Keep it as a coordinator.

**Do**: Add new steps if needed (update comment with step number).

### github-client.ts

**Responsibility**: All GitHub API interactions.

**Uses**: Octokit (GitHub's official SDK)

**Key Methods**:

- `getPullRequest()` - Fetch PR metadata
- `getChangedFiles()` - List changed files
- `getCommits()` - Get commit history
- `getDiff()` - Full diff
- `getDiffBetween()` - Incremental diff
- `updatePullRequest()` - Update PR body
- `commentOnPR()` - Post error comments

**Pattern**: All methods return data or empty/null on error. No throwing.

### diff-processor.ts

**Responsibility**: Make diff useful for LLM.

**Key Methods**:

- `processAndFilter()` - Main entry point
- `parseDiff()` - Parse unified diff format
- `shouldIgnoreFile()` - Check ignore patterns
- `detectLanguage()` - Identify file type
- `truncateChunks()` - Intelligently reduce size

**Ignore List**:

```typescript
/\.lock$/, /node_modules\/, /dist\/, /build\/, /* ... */
```

Add new patterns to ignore more file types.

**Language Detection**:

```typescript
languageMap: {
  '.ts': 'typescript',
  '.py': 'python',
  // Add more as needed
}
```

### llm-client.ts

**Responsibility**: LLM operations.

**Key Methods**:

- `buildPrompt()` - Create OpenAI messages
- `callLLM()` - Call OpenAI API with retry logic

**Retry Logic**:

```
Attempt 1: Immediate
Attempt 2: Wait 1s
Attempt 3: Wait 2s
Attempt 4: Wait 4s
```

**Error Handling**: All errors caught and logged. Never throws to orchestrator.

**Extending**: To support other LLMs:

```typescript
// Create new file: llm/anthropic-client.ts
// Implement same interface
// Update index.ts to use new client based on model input
```

### state-manager.ts

**Responsibility**: Track processing state for idempotency.

**Storage**: `.ai-pr-state.json` (local file)

**Data Structure**:

```typescript
{
  lastProcessedSha: "abc123def456...",
  processedAt: "2024-04-09T10:15:30.123Z",
  prNumber: 42
}
```

**Extending**: To support other storage:

1. Create `github-artifacts-state-manager.ts` (uses GitHub artifacts)
2. Create `dynamodb-state-manager.ts` (for distributed use)
3. Implement same interface
4. Swap in index.ts

### formatter.ts

**Responsibility**: Markdown formatting and PR body updates with smart content preservation.

**Key Methods**:

- `toMarkdown()` - JSON → Markdown (AI content only)
- `replaceAISection()` - Smart section replacement with content extraction
- `getAISection()` - Extract AI section for validation
- `extractRawPRDescription()` - Extract user-written descriptions (private)
- `generateDynamicChecklist()` - Create smart checklists based on files (private)

**Content Extraction Logic**:

1. **Extract Raw Description** - If user wrote description before action ran:

   ```typescript
   "This fixes auth bug #42" → Moved to Developer Notes
   ```

2. **Generate Dynamic Checklist** - Based on file changes:

   ```
   Test files (*.test.ts, __tests__/) → ✅ Tests added (checked)
   Docs (.md, docs/, README) → ✅ Documentation updated (checked)
   Config files (.json, .yml) → ⬜ Configuration validated (added)
   Large diffs (>500 changes) → ⬜ Performance reviewed (added)
   Large deletions (>100 lines) → ⬜ Breaking changes documented (added)
   ```

3. **Merge Content** - Preserve all user content:
   ```
   Raw Description + Existing Dev Notes → Developer Notes section
   Dynamic + User Edits → Checklist section
   AI Content → AI section (between markers)
   ```

**Section Markers**:

```html
<!-- AI:START -->
... content ...
<!-- AI:END -->
```

**Merge Logic**:

1. Extract raw description from PR body
2. If AI section exists → replace between markers
3. If no AI section → create complete template
4. Always preserve developer notes and checklist edits
5. Generate checklist dynamically based on files changed

### logger.ts

**Responsibility**: Consistent, formatted logging.

**Methods**:

```typescript
logger.info("General info");
logger.warn("Be careful");
logger.error("Oh no!");
logger.debug("Details (only in debug mode)");
logger.success("Great!");
```

**Pattern**: Include emoji + timestamp:

```
[2024-04-09T10:15:30.123Z] ✅ Something happened
```

## Types

All types in `src/utils/types.ts`.

**Key Types**:

- `PRMetadata` - PR title, body, SHAs
- `CommitInfo` - Commit SHA, message, author, date
- `FileChange` - File status, additions, deletions
- `DiffChunk` - File diff with metadata
- `LLMContext` - Input to LLM (chunks, commits, stats)
- `LLMOutput` - LLM response (summary, keyPoints, highlights)

**Adding New Types**: Add to `types.ts`, export, use in modules.

## Testing

### Manual Testing

#### Setup (Using Gemini - Free)

1. **Get Gemini API Key** (recommended for development - free tier available):
   - Go to [Google AI Studio](https://aistudio.google.com/apikey)
   - Click "Create API Key"
   - Select "Create new API key in new project"
   - Copy the API key

2. **Build**:

   ```bash
   npm run build
   ```

3. **Create test environment file** `.env.test`:

   ```
   GITHUB_TOKEN=ghp_xxxxx
   LLM_API_KEY=gsk_xxxxx  # Gemini API key
   GITHUB_REPOSITORY=owner/repo
   LLM_PROVIDER=gemini
   AI_MODEL=gemini-2.5-flash
   ```

4. **Run locally** (if needed):
   ```bash
   npm run dev
   ```

#### Why Gemini for Development?

- ✅ **Free tier available** - No billing account required
- ✅ **No mandatory costs** - Test without credit card
- ✅ **Same test coverage** - Produces high-quality summaries
- ❌ **OpenAI requires billing** - Mandatory payment account setup
- ❌ **No true free tier** - Will charge even small amounts

### CI/CD

GitHub Actions workflow in `.github/workflows/build.yml`:

- Runs on Node 20
- Type checks, lints, and bundles with `@vercel/ncc`
- Verifies `dist/index.js` and `dist/licenses.txt` exist
- Fails if committed `dist/` is out of date

## Code Standards

### TypeScript

**Strict Mode**: Always enabled in `tsconfig.json`.

**No `any` types**: Use `unknown` and narrow types or create proper interfaces.

```typescript
// ❌ Bad
function process(data: any) {
  return data.foo;
}

// ✅ Good
interface Data {
  foo: string;
}

function process(data: Data): string {
  return data.foo;
}
```

**Return Types**: Always specify (except obvious):

```typescript
// ✅ Good
async function getValue(): Promise<string> {
  return "value";
}

// ✅ Also good
const getValue = (): Promise<string> => "value";
```

### Naming

- Use `camelCase` for variables/functions
- Use `PascalCase` for classes/interfaces
- Use `UPPER_SNAKE_CASE` for constants
- Prefix private methods with `_` (optional, TypeScript has `private`)

### Comments

- Document **why**, not **what** (code shows what)
- Add JSDoc for public functions
- Add comments for complex logic

```typescript
/**
 * Parse diff content into per-file chunks
 * @param diffContent Raw unified diff output
 * @returns Array of file diffs
 */
private parseDiff(diffContent: string): DiffChunk[] {
  // Split by file headers (diff --git a/... b/...)
  // because some tests use multiline commit messages
  const lines = diffContent.split("\n");
  // ...
}
```

### Error Handling

**Pattern**: Never throw to orchestrator. Log and handle gracefully.

```typescript
try {
  const data = await api.call();
  return data;
} catch (error) {
  this.logger.error(`Failed: ${error.message}`);
  return null; // or empty value
}
```

## Contributing

### Before PR

1. **Code quality**:

   ```bash
   npm run typecheck
   npm run lint:fix
   npm run format
   npm run build
   ```

2. **No console.log**: Use logger

   ```typescript
   logger.info("message");
   ```

3. **Tests**: Add tests for new features
   ```bash
   npm run test -- --testPathPattern=new-feature
   ```

### PR Requirements

- ✅ Builds without errors
- ✅ Passes type check
- ✅ Passes linter
- ✅ Code formatted
- ✅ Tests pass
- ✅ Documentation updated

## Performance Tips

### For LLM Requests

- Keep context under 2000 tokens (fits in 4k model limit)
- Truncate large diffs intelligently
- Use cheaper models for low-risk PRs (gpt-3.5-turbo for docs)

### For GitHub API

- Cache PR metadata when possible
- Use GraphQL for multiple queries (future enhancement)
- Respect rate limits (60 requests/hour unauthenticated, 5000/hour authenticated)

### For Processing

- Lazy-load modules (already done)
- Use incremental diff (already enabled by default)
- Filter aggressively (ignore lock files, build outputs)

## Troubleshooting

### "dist/index.js not found"

```bash
npm run build
# Check that tsconfig.json outputs to lib/ before packaging
```

### "Lint errors"

```bash
npm run lint:fix
# Not all can be auto-fixed; read output
```

### "Type errors"

```bash
npm run typecheck
# Fix types, don't use `any`
```

### "Tests failing"

```bash
npm test -- --verbose
# Check error messages, update test expectations
```

### "Action doesn't run"

1. Verify `dist/index.js` exists (run `npm run build`)
2. Check GitHub Actions logs
3. Add debug logging: `debug: true` in action inputs
4. Test locally with GitHub CLI: `gh run view --log <RUN_ID>`

## Release Process

1. **Update version** in `package.json` and `action.yml`
2. **Build**: `npm run build`
3. **Commit**: `git commit -am "v1.2.3"`
4. **Tag**: `git tag v1.2.3`
5. **Push**: `git push origin main --tags`
6. **Create Release** on GitHub with changelog

## Testing Notes

### API Provider Strategy

**This project uses Gemini API for all development and testing:**

- ✅ Gemini (default) - Free tier, no billing required, excellent for PRs
- ⚠️ OpenAI - Requires mandatory billing account (charges apply)

Both providers are fully supported at runtime, but development uses Gemini to reduce friction for contributors.

## Further Reading

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Octokit SDK](https://github.com/octokit/rest.js)
- [Gemini API Docs](https://ai.google.dev/api) - Used for development and testing
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference) - Alternative (requires billing)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
