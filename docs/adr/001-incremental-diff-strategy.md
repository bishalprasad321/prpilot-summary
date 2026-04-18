# ADR-001: Incremental Diff Processing Strategy

## Status

Accepted

## Context

When a PR receives new commits, the action needs to decide whether to:
1. Process only the delta (new changes since last update) - **Incremental mode**
2. Process the full diff from base to head - **Full mode**

The problem arises when new commits add significantly more changes than previous ones. Processing only the delta leaves the LLM without proper context about the complete PR scope, leading to incomplete or inconsistent descriptions.

## Decision

Implement an intelligent strategy that:

1. Fetches both incremental and full diffs when in synchronize event
2. Compares their sizes using a 30% threshold
3. If incremental diff ≥ 30% of full diff size → switch to **full mode**
4. Otherwise, use **incremental mode** for performance

### Implementation Details

```typescript
// In src/index.ts, STEP 6
const incrementalDiff = await gitHub.getDiffBetween(lastProcessedSha, currentHeadSha);
const fullDiff = await gitHub.getDiff(prNumber);

const incrementalLineCount = incrementalDiff.split("\n").length;
const fullLineCount = fullDiff.split("\n").length;
const incrementalThreshold = fullLineCount * 0.3;

if (incrementalLineCount >= incrementalThreshold) {
  // Use full diff for complete context
  diffContent = fullDiff;
  diffMode = "full";
} else {
  // Use incremental for performance
  diffContent = incrementalDiff;
  diffMode = "incremental";
}
```

## Rationale

### Why Compare Sizes?

- **Performance**: Small incremental diffs are fast to process
- **Context**: Large incremental diffs likely contain substantial changes requiring full context
- **30% Threshold**: Empirically chosen balance between performance and accuracy

### Alternatives Considered

1. **Always use full diff**: Simple but inefficient for incremental updates
2. **Always use incremental diff**: Causes context loss for large changesets
3. **Use line count delta**: Less reliable than comparative sizing
4. **Configurable threshold**: Adds complexity; 30% is a good default

## Consequences

### Positive

✅ Consistent LLM context across PR updates  
✅ Accurate descriptions for large changesets  
✅ Maintains performance for small incremental changes  
✅ Prevents confusing partial descriptions  

### Negative

⚠️ Slightly higher API costs when threshold triggers full mode  
⚠️ Additional API call needed (fetches both diffs)  

## Trade-offs

- **Cost vs Accuracy**: Extra API call ensures accurate descriptions for important cases
- **Simplicity vs Flexibility**: Fixed threshold simpler than configuration

## Related

- Issue: Incremental diff causing context loss on large PRs
- PR: Logic not functioning correctly when newer commits added more git diff
- See also: [ADR-002: Markdown Structure Preservation](./002-markdown-structure-preservation.md)
