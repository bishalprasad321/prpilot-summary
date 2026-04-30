# API Reference

## Action inputs

### Required inputs

#### `github_token`

**Type:** `string`

GitHub token used to read PR details and write the PR body. The default `${{ secrets.GITHUB_TOKEN }}` is sufficient.

Required permissions:

- `pull-requests: write` — update the PR body and post comments
- `contents: read` — read diffs and commit history

```yaml
github_token: ${{ secrets.GITHUB_TOKEN }}
```

#### `llm_api_key`

**Type:** `string`

API key for the configured LLM provider.

```yaml
llm_api_key: ${{ secrets.GROQ_API_KEY }}
```

---

### Optional inputs

#### `llm_provider`

**Type:** `string`  
**Default:** `"auto"`  
**Options:** `auto` | `groq` | `openai` | `openai-compatible` | `gemini`

Which LLM provider to use. When set to `auto`, the provider is inferred from the model name prefix (e.g. a model starting with `gemini` routes to Gemini, `gpt` routes to OpenAI).

```yaml
llm_provider: groq
```

#### `llm_api_base_url`

**Type:** `string`  
**Default:** `""` (uses the provider's default endpoint)

Custom API base URL. Useful for:

- Routing through a proxy
- Self-hosted or third-party OpenAI-compatible services (LiteLLM, LocalAI, Ollama)
- Corporate API gateways

```yaml
llm_api_base_url: https://api.your-proxy.example.com/v1
```

#### `ai_model`

**Type:** `string`  
**Default:** `"openai/gpt-oss-120b"`

The model identifier to pass to the provider.

Examples:

- Groq: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`
- OpenAI: `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`
- Gemini: `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-pro`
- Custom: any model string your endpoint accepts

```yaml
ai_model: openai/gpt-oss-120b
```

#### `max_diff_lines`

**Type:** `number`  
**Default:** `5000`

Maximum number of diff lines to process. When the diff exceeds this limit, lower-priority chunks (removed and renamed files) are dropped first. Increase for large PRs; decrease to reduce token usage and cost.

```yaml
max_diff_lines: 8000
```

#### `enable_incremental_diff_processing`

**Type:** `boolean`  
**Default:** `true`

When enabled, the action fetches both an incremental diff (from last processed SHA to head) and the full diff (base to head), then compares their sizes. If the incremental diff is 30% or more of the full diff, the full diff is used to preserve context. Otherwise, only the incremental diff is processed.

Set to `false` to always use the full diff.

```yaml
enable_incremental_diff_processing: false
```

#### `debug`

**Type:** `boolean`  
**Default:** `"false"`

When `true`, the action logs the full LLM context object, raw API responses, formatted Markdown, and the final PR body. Useful for troubleshooting.

```yaml
debug: "true"
```

---

## API keys

### Groq (recommended, free tier available)

The default model `openai/gpt-oss-120b` is selected for its 131k context window and 65k max completion limit.

1. Create an account at [console.groq.com](https://console.groq.com) and generate an API key
2. Add it to your repository secrets as `GROQ_API_KEY`

```yaml
llm_provider: groq
ai_model: openai/gpt-oss-120b
llm_api_key: ${{ secrets.GROQ_API_KEY }}
```

### Gemini (free tier available)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key (no billing required)
2. Add it to your repository secrets as `GEMINI_API_KEY`

```yaml
llm_provider: gemini
ai_model: gemini-2.5-flash
llm_api_key: ${{ secrets.GEMINI_API_KEY }}
```

### OpenAI

> **Note:** OpenAI requires a billing account. API usage incurs charges.

1. Create an account at [platform.openai.com](https://platform.openai.com) and enable billing
2. Generate an API key
3. Add it to your repository secrets as `OPENAI_API_KEY`

```yaml
llm_provider: openai
ai_model: gpt-4o-mini
llm_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Other OpenAI-compatible providers

Use `llm_provider: openai-compatible` and set `llm_api_base_url` to your endpoint:

```yaml
llm_provider: openai-compatible
llm_api_base_url: https://your-endpoint.example.com/v1
ai_model: your-model-name
llm_api_key: ${{ secrets.YOUR_API_KEY }}
```

---

## PR template format and behavior

### Generated template

```markdown
## Summary

<!-- AI:START -->

## AI Generated Summary

Summary of changes.

**Key Points:**

- Point 1
- Point 2

**Highlights:**

- Highlight 1
- Highlight 2

<!-- AI:END -->

---

## Developer Notes

- Add any extra context here

---

## Checklist

- [ ] Documentation updated / modified
```

### Section behavior

| Section                  | Who controls it                                                        | Preserved on update |
| ------------------------ | ---------------------------------------------------------------------- | ------------------- |
| **Summary**              | Not touched by the action; available for a manual summary              | Yes                 |
| **AI Generated Summary** | Regenerated on every run                                               | No                  |
| **Developer Notes**      | User-controlled; pre-written descriptions are moved here automatically | Always              |
| **Checklist**            | User-controlled; initial item generated from file change data          | Always              |

### Content preservation in detail

The action runs the following logic before updating the PR body:

1. If a raw description exists (text before any template markers), it is extracted
2. If Developer Notes already exist, they are extracted
3. The raw description and existing notes are merged (raw description first)
4. The checklist is generated or preserved based on whether `*.md` files appear in the diff
5. Only the content between `<!-- AI:START -->` and `<!-- AI:END -->` is replaced
6. The rest of the body is rebuilt around the preserved content

**Example:**

Before the first run, the developer writes:

```
This PR refactors the auth module. Related to #42.
```

After the first run, the PR body becomes:

```markdown
## Summary

<!-- AI:START -->

## AI Generated Summary

...

<!-- AI:END -->

---

## Developer Notes

This PR refactors the auth module. Related to #42.

---

## Checklist

- [ ] Documentation updated / modified
```

On subsequent runs, the Developer Notes content is never touched.

### Idempotency

The action tracks the last processed commit SHA. If the SHA has not changed since the last run, the action exits immediately without calling the LLM or modifying the PR.

---

## TypeScript / JavaScript API

If you want to use the modules directly:

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

const github = new GitHubClient(token, { owner, repo });
const diffProcessor = new DiffProcessor();
const llm = new LLMClient(apiKey, model, { provider: "groq" });
const stateManager = new StateManager();
const formatter = new Formatter();

const pr = await github.getPullRequest(123);
const files = await github.getChangedFiles(123);
const diff = await github.getDiff(123);
const commits = await github.getCommits(123);

const chunks = diffProcessor.processAndFilter(files, diff, 5000);

const context = {
  chunks,
  commitMessages: commits.map((c) => c.message),
  repoMetadata: {
    owner,
    name: repo,
    prNumber: 123,
    prTitle: pr.title,
    prDescription: pr.body,
  },
  stats: {
    filesChanged: files.length,
    totalAdditions: chunks.reduce((n, c) => n + c.additions, 0),
    totalDeletions: chunks.reduce((n, c) => n + c.deletions, 0),
    commits: commits.length,
  },
};

const prompt = llm.buildPrompt(context);
const output = await llm.callLLM(prompt);

const markdown = formatter.toMarkdown(output);
const updatedBody = formatter.replaceAISection(pr.body ?? "", markdown, files);
await github.updatePullRequest(123, { body: updatedBody });

stateManager.setLastProcessedSha(commits[commits.length - 1].sha);
```

### Class reference

#### `GitHubClient`

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

#### `DiffProcessor`

```typescript
class DiffProcessor {
  processAndFilter(
    files: FileChange[],
    diffContent: string,
    maxDiffLines: number
  ): DiffChunk[];
}
```

#### `LLMClient`

```typescript
class LLMClient {
  constructor(apiKey: string, model: string, options?: LLMClientOptions);
  buildPrompt(context: LLMContext): OpenAIMessage[];
  callLLM(messages: OpenAIMessage[]): Promise<LLMOutput>;
  getProvider(): string;
}
```

#### `Formatter`

```typescript
class Formatter {
  toMarkdown(llmOutput: LLMOutput): string;
  replaceAISection(
    existingBody: string,
    newAIContent: string,
    files?: FileChange[] // used to generate the checklist
  ): string;
  getAISection(body: string): string | null;
}
```

#### `StateManager`

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

### Shared types

```typescript
interface LLMOutput {
  summary: string;
  keyPoints: string[];
  highlights: string[];
  breaking?: boolean;
}

interface FileChange {
  filename: string;
  status:
    | "added"
    | "modified"
    | "removed"
    | "renamed"
    | "copied"
    | "unchanged"
    | "type-changed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface DiffChunk {
  file: string;
  status: string;
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

## Output format

The AI section inserted into the PR body follows this structure:

```markdown
## AI Generated Summary

[Concise summary of the changes — max ~40 words]

**Key Points:**

- [Up to 3 brief points reviewers should know]

**Highlights:**

- [Up to 2 notable aspects of the change]

> **Breaking change:** [Description if applicable]
```

The section is wrapped in HTML comment markers that are invisible in rendered Markdown:

```html
<!-- AI:START -->
...content...
<!-- AI:END -->
```

These markers allow the action to reliably locate and replace only the AI-generated portion on subsequent runs.

---

## Error handling

If any step fails, the action:

1. Logs the error with full details
2. Attempts to post a comment on the PR explaining the failure
3. Exits without modifying the PR body
4. Sets the workflow step status to failed

Common errors and fixes:

| Error                              | Likely cause                                      | Fix                                                                 |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| "Missing required inputs"          | Secret not configured                             | Add `github_token` and `llm_api_key` to repository secrets          |
| "Unsupported llm_provider"         | Invalid provider string                           | Use one of: `auto`, `groq`, `openai`, `gemini`, `openai-compatible` |
| "Failed to fetch PR"               | Wrong PR number or insufficient token permissions | Verify the PR number and token scope                                |
| "LLM call failed after 3 attempts" | API error, rate limit, or malformed response      | Check the API key, provider status, and enable `debug: true`        |

---

## Example workflows

### Basic Groq setup

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
```

### Custom OpenAI-compatible provider with debug logging

```yaml
- name: Generate AI PR Description
  uses: bishalprasad321/prpilot-summary@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    llm_api_key: ${{ secrets.LITELLM_API_KEY }}
    llm_provider: openai-compatible
    llm_api_base_url: https://api.litellm.example.com/v1
    ai_model: gpt-4o-mini
    max_diff_lines: 10000
    enable_incremental_diff_processing: true
    debug: "true"
```

---

## Troubleshooting

### Enable debug logging

```yaml
debug: "true"
```

This logs the full LLM context, raw responses, formatted Markdown, and the complete PR body before and after the update.

### Handling rate limits

If you encounter rate limit errors from the LLM provider:

- The action already retries up to 3 times with exponential backoff
- For persistent limits, reduce `max_diff_lines` to keep context smaller
- Consider switching to a provider with a higher rate limit (Groq has generous free-tier limits)

### Large diffs

For repositories with consistently large PRs:

- Increase `max_diff_lines` (e.g. `8000` or `10000`)
- Keep `enable_incremental_diff_processing: true` — on updates, only the delta is processed when it is small enough
- Consider splitting very large PRs into smaller, focused changes
