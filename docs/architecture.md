# Architecture Overview

## System Design

The PR Pilot Summary follows a modular, layered architecture designed for clarity, testability, and maintainability.

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Workflow Trigger                      │
│              (pull_request: [opened, synchronize])              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Main Orchestrator   │
                    │   (src/index.ts)      │
                    └──────────┬────────────┘
                               │
    ┌──────────────────────────┼──────────────────────────┐
    │                          │                          │
    ▼                          ▼                          ▼
┌─────────────┐        ┌──────────────┐         ┌────────────┐
│   GitHub    │        │    Diff      │         │   LLM      │
│   Client    │        │  Processor   │         │   Client   │
│             │        │              │         │            │
│ - Fetch PR  │        │ - Parse diff │         │ - Build    │
│ - Get files │        │ - Filter     │         │   prompt   │
│ - Get diffs │        │ - Chunk      │         │ - Call API │
│ - Update    │        │ - Detect     │         │ - Validate │
│   body      │        │   language   │         │   output   │
└─────────────┘        └──────────────┘         └────────────┘
    │                          │                       │
    └──────────────────────────┼───────────────────────┘
                               │
                    ┌──────────▼────────────┐
                    │     Formatter         │
                    │                       │
                    │ - Convert to Markdown │
                    │ - Replace AI section  │
                    │ - Preserve structure  │
                    └──────────┬─────────── ┘
                               │
                    ┌──────────▼────────────┐
                    │   State Manager       │
                    │                       │
                    │ - Track SHA           │
                    │ - Ensure idempotency  │
                    └──────────┬─────────── ┘
                               │
                    ┌──────────▼────────────┐
                    │  GitHub API Update    │
                    │  (Update PR body)     │
                    └────────────────────── ┘
```

## Core Modules

### 1. **Main Orchestrator** (`src/index.ts`)

**Responsibility**: Coordinate all modules and control execution flow

- **14-Step Pipeline**:
  1. Parse inputs
  2. Extract GitHub context
  3. Initialize clients
  4. Fetch PR metadata
  5. State check (idempotency)
  6. Diff retrieval
  7. Diff processing
  8. Context preparation
  9. LLM execution
  10. Format output
  11. Safe PR update
  12. Push to GitHub
  13. Persist state
  14. Final logging

- **Error Handling**: Graceful failure without breaking PR flow

### 2. **GitHub Client** (`src/github/github-client.ts`)

**Responsibility**: Abstract GitHub API interactions using Octokit

**Methods**:

- `getPullRequest(prNumber)` - Fetch PR metadata
- `getChangedFiles(prNumber)` - Get affected files
- `getCommits(prNumber)` - Get commit history
- `getDiff(prNumber)` - Get full diff (base...head)
- `getDiffBetween(baseSha, headSha)` - Get delta diff
- `updatePullRequest(prNumber, options)` - Update PR body
- `commentOnPR(prNumber, message)` - Post comment

### 3. **Diff Processor** (`src/diff/diff-processor.ts`)

**Responsibility**: Intelligent diff filtering, chunking, and classification

**Key Features**:

- **Filtering**: Ignores binary files, build artifacts, node_modules
- **Language Detection**: Identifies file types by extension
- **Truncation**: Prioritizes modified files over added/removed
- **Chunking**: Splits large diffs while preserving context

**Ignore Patterns**:

```
- .lock files (package-lock.json, yarn.lock)
- Binary files (.png, .jpg, .pdf, etc.)
- Build outputs (dist/, build/)
- Log files
```

### 4. **LLM Client** (`src/llm/llm-client.ts`)

**Responsibility**: Abstract LLM provider interactions

**Supported Providers**:

- Groq
- OpenAI (GPT-4, GPT-3.5)
- Gemini
- OpenAI-compatible endpoints
- Auto-detection

**Methods**:

- `buildPrompt(context)` - Create prompt from context
- `callLLM(prompt)` - Execute LLM API call
- `getProvider()` - Return resolved provider name

### 5. **Formatter** (`src/utils/formatter.ts`)

**Responsibility**: Convert LLM output to Markdown and intelligently manage PR body sections with smart content preservation

**Key Methods**:

- `toMarkdown(llmOutput)` - Convert JSON to Markdown (AI content only)
- `replaceAISection(body, content, files?)` - Replace/append AI section with smart content preservation
- `extractRawPRDescription(body)` - Extract user pre-written descriptions
- `generateDynamicChecklist(files)` - Create generic checklist based on markdown file changes
- `extractExistingDeveloperNotes(body)` - Preserve developer notes
- `extractExistingChecklist(body)` - Preserve user's custom checklist items
- `createCompleteTemplate(aiContent, devNotes, checklist)` - Generate full template
- `replaceSectionWithTemplate(...)` - Update template with preserved content

**Features**:

- ✅ Extracts and preserves user-written PR descriptions
- ✅ Moves raw descriptions to Developer Notes section
- ✅ Generates generic checklist based on markdown file changes:
  - ✅ Documentation updated / modified (checked only when `*.md` files changed)
- ✅ Preserves developer notes and checklist items
- ✅ Uses HTML comments as markers (`<!-- AI:START -->...<!-- AI:END -->`)
- ✅ Generates complete template on first run (4 sections)
- ✅ Intelligent content extraction using regex patterns
- ✅ Maintains consistent spacing and structure
- ✅ Handles edge cases (empty body, missing sections, no file data)

**Content Preservation Logic**:

1. **Extract** - Raw description from PR body
2. **Merge** - Raw description + existing developer notes
3. **Generate** - Generic checklist based on markdown files changed
4. **Update** - Replace only AI section, preserve everything else
5. **Result** - Zero data loss, smart suggestions

**PR Body Template Structure**:

```markdown
## 📌 Summary

[User summary section]

<!-- AI:START -->

## 🤖 AI Generated Summary

[AI content - gets updated]

<!-- AI:END -->

---

## 🧑‍💻 Developer Notes

[User content - ALWAYS preserved]

---

## ✅ Checklist

[User items - NEVER overwritten]
```

**Content Preservation Logic**:

- Extracts existing developer notes before update
- Extracts existing checklist before update
- Replaces only AI section between markers
- Rebuilds template with preserved content
- Results in zero data loss on updates

### 6. **State Manager** (`src/state/state-manager.ts`)

**Responsibility**: Persist processing state for idempotency

**Storage**: Local file (`.ai-pr-state.json`)

**Tracks**:

- Last processed commit SHA
- Processing timestamp
- PR number

**Ensures**: PR not reprocessed if no new commits

## Data Flow

### Step-by-Step Execution

```
1. GitHub sends webhook (pull_request event)
   ↓
2. Action reads inputs (tokens, model, etc.)
   ↓
3. Fetch PR details: title, body, commits, files
   ↓
4. Check state: was this commit already processed?
   └─→ Yes? Exit (idempotency)
   └─→ No? Continue
   ↓
5. Decide: incremental or full diff mode
   ├─→ First push: full diff
   ├─→ New commits + small changes: incremental
   └─→ New commits + large changes: full
   ↓
6. Process diff:
   - Parse into file chunks
   - Filter ignored files
   - Detect languages
   - Truncate if necessary
   ↓
7. Prepare LLM context:
   - Include filtered chunks
   - Add commit messages
   - Add repository metadata
   ↓
8. Call LLM API:
   - Generate summary
   - Extract key points
   - Identify highlights
   - Detect breaking changes
   ↓
9. Format as Markdown:
   - Clean structure
   - Consistent spacing
   - Clear sections
   ↓
10. Update PR body:
    - Replace existing AI section (if exists)
    - Or append new AI section
    - Preserve developer notes
    ↓
11. Save state:
    - Update last processed SHA
    - Save to file
    ↓
12. Done! PR description updated
```

## Configuration

### Environment Variables

```typescript
{
  githubToken: string;          // GitHub API token
  llmApiKey: string;            // LLM provider API key
  llmProvider: string;          // Provider: auto|groq|openai|gemini|openai-compatible
  llmApiBaseUrl?: string;       // Custom endpoint (optional)
  aiModel: string;              // Model name (e.g., openai/gpt-oss-120b)
  maxDiffLines: number;         // Truncate threshold (default: 5000)
  enableIncrementalDiffProcessing: boolean; // Use incremental mode
  debug: boolean;               // Verbose logging
}
```

## Testing Strategy

### Unit Tests

- **DiffProcessor**: Filtering, truncation, language detection
- **Formatter**: Markdown generation, section replacement
- **StateManager**: State persistence and retrieval

### Integration Testing

- Full pipeline with mock GitHub/LLM APIs
- Real API calls in CI/CD before release

### Coverage Goals

- Core logic: 80%+ coverage
- Edge cases: All major scenarios tested
- Error handling: Failure modes validated

## Performance Considerations

### Optimization

- **Diff Truncation**: Large diffs processed efficiently
- **Incremental Mode**: Delta processing for small changes
- **Lazy Loading**: Clients initialized on-demand
- **Caching**: State file prevents reprocessing

### Scalability

- Handles PRs with 100+ files
- Supports diffs up to 5000+ lines
- Manages multiple commits efficiently

## Security

### Access Control

- ✅ GitHub token scoped to minimal permissions
- ✅ LLM API key encrypted in GitHub secrets
- ✅ No sensitive data logged

### Input Validation

- ✅ Provider validation (whitelist)
- ✅ Token format checks
- ✅ Diff content sanitization

## Deployment

### GitHub Actions

- Bundled with `@vercel/ncc`
- Single file distribution (`dist/index.js`)
- Source maps included for debugging

### Release Process

1. Create PR with changes
2. Tests run automatically
3. Merge to main
4. Create Git tag (v1.x.x)
5. GitHub Actions builds and publishes
