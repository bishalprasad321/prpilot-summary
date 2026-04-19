# API Documentation

## GitHub Action Inputs

### Required Inputs

#### `github_token`

**Type**: `string`  
**Required**: ✅ Yes

GitHub Personal Access Token or `${{ secrets.GITHUB_TOKEN }}` for workflow context.

**Permissions Required**:

- `pull-requests: write` - Update PR descriptions
- `contents: read` - Read PR content and diffs

**Example**:

```yaml
github_token: ${{ secrets.GITHUB_TOKEN }}
```

#### `llm_api_key`

**Type**: `string`  
**Required**: ✅ Yes

API key for your LLM provider (OpenAI, Gemini, etc.).

**Example**:

```yaml
llm_api_key: ${{ secrets.GEMINI_API_KEY }}
```

---

### Optional Inputs

#### `llm_provider`

**Type**: `string`  
**Required**: ❌ No  
**Default**: `"auto"`  
**Options**: `"auto"` | `"openai"` | `"openai-compatible"` | `"gemini"`

Specifies which LLM provider to use. `"auto"` attempts to detect based on model name.

**Example**:

```yaml
llm_provider: gemini
```

#### `llm_api_base_url`

**Type**: `string`  
**Required**: ❌ No  
**Default**: `""` (empty)

Custom API endpoint URL. Useful for:

- OpenAI-compatible providers (LiteLLM, Ollama, LocalAI)
- Corporate proxies
- Self-hosted LLM services

**Example**:

```yaml
llm_api_base_url: https://api.custom-provider.com/v1
```

#### `ai_model`

**Type**: `string`  
**Required**: ❌ No  
**Default**: `"gpt-4o-mini"`

The AI model to use. Examples:

- OpenAI: `"gpt-4o"`, `"gpt-4o-mini"`, `"gpt-3.5-turbo"`
- Gemini: `"gemini-2.5-flash"`, `"gemini-2.0-flash"`, `"gemini-1.5-pro"`
- Custom: Any model your endpoint supports

**Example**:

```yaml
ai_model: gemini-2.5-flash
```

#### `max_diff_lines`

**Type**: `number`  
**Required**: ❌ No  
**Default**: `5000`

Maximum number of diff lines to process. If the diff exceeds this, the action will attempt to summarize large changes instead of processing line-by-line.

**Example**:

```yaml
max_diff_lines: 8000
```

#### `enable_incremental_diff_processing`

**Type**: `boolean`  
**Required**: ❌ No  
**Default**: `true`

Enable intelligent incremental diff processing. When enabled:

- On first push: processes full diff
- On subsequent pushes: processes delta (new changes only)
- If delta is large: automatically falls back to full diff for context

**Example**:

```yaml
enable_incremental_diff_processing: false
```

#### `debug`

**Type**: `boolean`  
**Required**: ❌ No  
**Default**: `"true"`

Enable debug mode for verbose logging. Helpful for troubleshooting.

**Example**:

```yaml
debug: "false"
```

---

## Getting API Keys

### Gemini API (Recommended for Development)

✅ **Free tier available** | No billing account required | Tested and used in development

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API Key"**
3. Select **"Create new API key in new project"**
4. Copy the generated API key
5. Add to repo secrets as `GEMINI_API_KEY`

**In your workflow:**

```yaml
llm_provider: gemini
ai_model: gemini-2.5-flash
llm_api_key: ${{ secrets.GEMINI_API_KEY }}
```

### OpenAI API

⚠️ **Requires billing account** | Charges will apply | Not used in development/testing due to costs

1. Create account on [platform.openai.com](https://platform.openai.com)
2. Enable billing (mandatory - will charge for usage)
3. Create API key in settings
4. Add to repo secrets as `OPENAI_API_KEY`

**In your workflow:**

```yaml
llm_provider: openai
ai_model: gpt-4o-mini
llm_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Other OpenAI-Compatible Providers

Providers like LiteLLM, Ollama, LocalAI also work. See `llm_api_base_url` for custom endpoints.

---

## PR Template Format & Behavior

### Generated Template

The action generates a complete, professional PR body template with four sections:

```markdown
## 📌 Summary

<!-- AI:START -->

## 🤖 AI Generated Summary

Summary of code changes and impact.

**Key Points:**

- Implemented feature X
- Improved performance by Y%

**Highlights:**

- Backward compatible
- Zero downtime deployment

<!-- AI:END -->

---

## 🧑‍💻 Developer Notes

- Add any extra context here

---

## ✅ Checklist

- [ ] Tests added
- [ ] Documentation updated
```

### Section Behavior

| Section                     | AI Role          | User Role               | Preserved on Update |
| --------------------------- | ---------------- | ----------------------- | ------------------- |
| **📌 Summary**              | Not touched      | Optional custom summary | ✅ Yes              |
| **🤖 AI Generated Summary** | Updated each run | Read-only               | ❌ No (regenerated) |
| **🧑‍💻 Developer Notes**      | Not touched      | Add/edit notes freely   | ✅ **Always**       |
| **✅ Checklist**            | Not touched      | Add/edit items freely   | ✅ **Always**       |

### Content Preservation

**How It Works:**

1. **First PR** → Generates complete template with defaults
2. **User Edits** → Adds notes to "Developer Notes" or custom checklist items
3. **PR Updates** → Action:
   - Extracts your developer notes before update
   - Extracts your checklist items before update
   - Regenerates only the AI section
   - Rebuilds template with your content preserved ✅
4. **Result** → Zero data loss, your content stays forever

**Example:**

```yaml
Before Update:
- Developer Notes: ["Note from reviewer", "TODO: verify with #42"]
- Checklist: ["[x] Tests", "[ ] Security audit", "[ ] API docs"]

After Update:
- Developer Notes: ["Note from reviewer", "TODO: verify with #42"]  ← PRESERVED ✅
- Checklist: ["[x] Tests", "[ ] Security audit", "[ ] API docs"]   ← PRESERVED ✅
- AI Section: [NEW CONTENT]
```

### Idempotency

- **Safe to run multiple times** → No duplicated content
- **Only AI section changes** → Between markers `<!-- AI:START/END -->`
- **Your content stays** → Developer notes and checklist untouched

---

## TypeScript / JavaScript API

If using this action as a library in Node.js:

### Installation

```bash
npm install prpilot-summary
```

### Usage

```typescript
import {
  GitHubClient,
  DiffProcessor,
  LLMClient,
  StateManager,
  Formatter,
} from "prpilot-summary";

// Initialize clients
const github = new GitHubClient(token, { owner: "user", repo: "repo" });
const diffProcessor = new DiffProcessor();
const llm = new LLMClient(apiKey, model, { provider: "openai" });
const stateManager = new StateManager();
const formatter = new Formatter();

// Fetch PR details
const pr = await github.getPullRequest(123);
const files = await github.getChangedFiles(123);
const diff = await github.getDiff(123);

// Process diff
const chunks = diffProcessor.processAndFilter(files, diff, 5000);

// Prepare LLM context
const context = {
  chunks,
  commitMessages: [...],
  repoMetadata: { ... },
  stats: { ... },
};

// Call LLM
const prompt = llm.buildPrompt(context);
const output = await llm.callLLM(prompt);

// Format output
const markdown = formatter.toMarkdown(output);

// Update PR
const body = pr.body || "";
const updated = formatter.replaceAISection(body, markdown);
await github.updatePullRequest(123, { body: updated });

// Save state
stateManager.setLastProcessedSha(headSha);
```

### Classes

#### GitHubClient

```typescript
class GitHubClient {
  constructor(githubToken: string, config: GitHubClientConfig);

  getPullRequest(prNumber: number): Promise<PRMetadata | null>;
  getChangedFiles(prNumber: number): Promise<FileChange[]>;
  getCommits(prNumber: number): Promise<CommitInfo[]>;
  getDiff(prNumber: number): Promise<string>;
  getDiffBetween(baseSha: string, headSha: string): Promise<string>;
  updatePullRequest(
    prNumber: number,
    options: UpdatePROptions
  ): Promise<boolean>;
  commentOnPR(prNumber: number, message: string): Promise<boolean>;
}
```

#### DiffProcessor

```typescript
class DiffProcessor {
  processAndFilter(
    files: FileChange[],
    diffContent: string,
    maxDiffLines: number
  ): DiffChunk[];
}
```

#### LLMClient

```typescript
class LLMClient {
  constructor(apiKey: string, model: string, options?: LLMClientOptions);

  buildPrompt(context: LLMContext): string;
  callLLM(prompt: string): Promise<Record<string, unknown>>;
  getProvider(): string;
}
```

#### Formatter

```typescript
class Formatter {
  toMarkdown(llmOutput: LLMOutput): string;

  // Smart content preservation with optional file data
  replaceAISection(
    existingBody: string,
    newAIContent: string,
    files?: FileChange[] // Optional: file changes for dynamic checklist
  ): string;

  getAISection(body: string): string | null;
}
```

**Smart Features** (when `files` parameter provided):

- 📝 Extracts pre-written PR descriptions and moves to Developer Notes
- ✅ Generates dynamic checklist based on file types changed
- 🛡️ Preserves all user content (dev notes, checklist edits)
- 🔄 Only regenerates AI section on PR updates

**Dynamic Checklist Examples:**

```typescript
// Files changed: __tests__/auth.test.ts, docs/README.md
formatter.replaceAISection(body, aiContent, files);

// Generates checklist:
// - [x] Tests added       (detected test files)
// - [x] Documentation updated (detected .md files)
// - [ ] Configuration validated (only if .json/.yml changed)
```

#### StateManager

```typescript
class StateManager {
  constructor(workingDir?: string);

  getLastProcessedSha(): string | null;
  setLastProcessedSha(sha: string): void;
  getPRNumber(): number | null;
  setPRNumber(prNumber: number): void;
  getState(): StateData;
  reset(): void;
}
```

### Types

```typescript
interface LLMOutput {
  summary: string;
  keyPoints: string[];
  highlights: string[];
  breaking?: boolean;
}

interface FileChange {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface DiffChunk {
  file: string;
  status: FileChange["status"];
  additions: number;
  deletions: number;
  content: string;
  language?: string;
}

interface PRMetadata {
  title: string;
  body: string;
  base: { sha: string };
  head: { sha: string };
}

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}
```

---

## Output Format

### PR Description Section

The action inserts the following into your PR description:

```markdown
## 🤖 AI Generated Summary

[AI-generated summary of changes]

**Key Points:**

- Key point 1
- Key point 2
- Key point 3

**Highlights:**

- Notable change 1
- Notable change 2

⚠️ **BREAKING CHANGES**
[If applicable]
```

### HTML Markers

The AI section is wrapped with HTML comments for reliable replacement:

```html
<!-- AI:START -->
[AI-generated content here]
<!-- AI:END -->
```

These markers:

- Are invisible in rendered Markdown
- Enable reliable section replacement
- Preserve developer notes outside markers

---

## Error Handling

The action implements graceful error handling:

### On Error

1. **Logs detailed error message**
2. **Posts comment on PR** (if possible)
3. **Does NOT modify PR description**
4. **Sets action status to failed**

### Common Issues

| Error                     | Cause                                   | Solution                                                    |
| ------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| "Missing required inputs" | `github_token` or `llm_api_key` not set | Check secrets configuration                                 |
| "Invalid llm_provider"    | Provider not supported                  | Use one of: `auto`, `openai`, `gemini`, `openai-compatible` |
| "Failed to fetch PR"      | Invalid PR number or token permissions  | Verify PR number and token scopes                           |
| "LLM execution failed"    | API error or rate limit                 | Check API key, quota, and retry                             |

---

## Examples

### Basic Setup

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
      - name: Generate AI PR Description
        uses: bishalprasad321/prpilot-summary@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          llm_api_key: ${{ secrets.GEMINI_API_KEY }}
          llm_provider: gemini
          ai_model: gemini-2.5-flash
```

### Advanced Setup with Custom Provider

```yaml
- name: Generate with Custom LLM Provider
  uses: bishalprasad321/prpilot-summary@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    llm_api_key: ${{ secrets.LITELLM_API_KEY }}
    llm_provider: openai-compatible
    llm_api_base_url: https://api.litellm.ai/v1
    ai_model: gpt-4o-mini
    max_diff_lines: 10000
    enable_incremental_diff_processing: true
    debug: "true"
```

---

## Troubleshooting

### Enable Debug Logging

Set `debug: "true"` to see detailed execution logs:

```yaml
debug: "true"
```

### Check PR for Errors

If the action fails:

1. Check GitHub Actions log
2. Look for error comment on PR
3. Verify secrets are configured
4. Ensure token has correct permissions

### Rate Limiting

If you hit LLM API rate limits:

- Increase `max_diff_lines` to trigger summarization sooner
- Disable `enable_incremental_diff_processing` to reduce API calls
- Check your provider's usage dashboard

### Large Diffs

For repositories with large diffs:

- Increase `max_diff_lines` threshold
- The action will skip when diff exceeds threshold
- Consider breaking up changes into smaller PRs
