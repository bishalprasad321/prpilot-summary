# ADR-001: Incremental Diff Processing Strategy

## Status

Accepted

## Context

When a PR receives new commits, the action must decide whether to process only the delta (changes since the last run) or the full diff from base to head.

Processing only the delta is efficient but risks giving the LLM an incomplete view of the PR. For example, if a developer rewrites a large portion of the codebase in a follow-up commit, the incremental diff alone provides enough context. But if a small fixup commit is pushed after a large initial change, the incremental diff is trivially small and the LLM would produce a description that ignores the bulk of the work.

The question is: how do we decide which mode to use on a given run?

## Decision

On every `synchronize` event (i.e. new commits pushed to a PR) where incremental processing is enabled:

1. Fetch both the incremental diff (from last processed SHA to current head) and the full diff (from base to current head)
2. Count the lines in each
3. If the incremental diff is **30% or more** of the full diff by line count, use the full diff
4. Otherwise, use the incremental diff

```typescript
const incrementalLineCount = incrementalDiff.split("\n").length;
const fullLineCount = fullDiff.split("\n").length;
const threshold = fullLineCount * 0.3;

if (incrementalLineCount >= threshold) {
  diffContent = fullDiff;
  diffMode = "full";
} else {
  diffContent = incrementalDiff;
  diffMode = "incremental";
}
```

## Rationale

The 30% threshold is based on the following reasoning:

- If the new commits introduce less than a third of the total diff, they are likely small fixups or minor additions. The LLM can produce a useful incremental update without full context.
- If the new commits account for 30% or more of the total diff, they represent a substantial portion of the PR. Using an incremental diff in this case would cause the LLM to ignore the earlier work, producing an inaccurate or incomplete description.

This avoids the two failure modes:

- Always using the full diff wastes tokens and increases latency on trivial updates
- Always using the incremental diff causes silent context loss on substantial follow-up commits

### Alternatives considered

| Approach                                                | Reason rejected                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Always use full diff                                    | Inefficient for routine small updates; higher token cost                                                                    |
| Always use incremental diff                             | Causes context loss when follow-up commits are significant                                                                  |
| Compare total additions/deletions instead of line count | Unified diff line count is a straightforward and reliable proxy; additions/deletions alone can be misleading for moved code |
| Make the threshold configurable                         | Adds complexity without meaningful benefit; 30% is a reasonable default for most repositories                               |

## Consequences

**Positive:**

- Consistent LLM context regardless of how incrementally a PR is developed
- Accurate descriptions for PRs with substantial follow-up commits
- Reduced token usage for PRs with small routine updates

**Negative:**

- Every `synchronize` run fetches two diffs instead of one, adding one extra GitHub API call
- Slightly higher API usage on runs that fall back to full mode

The extra API call is inexpensive relative to the LLM call and the cost of generating an inaccurate PR description.

## Related

- [ADR-002: Markdown Structure Preservation](./002-markdown-structure-preservation.md)
