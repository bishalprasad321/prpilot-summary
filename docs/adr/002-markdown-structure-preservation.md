# ADR-002: Markdown Structure Preservation on Re-processing

## Status

Accepted

## Context

When a PR receives new commits, the action replaces the AI-generated section. During early development, repeated replacements caused progressive degradation of the PR body:

- Sections ran together with insufficient whitespace between them
- Nested heading structure (`##` followed by `###`) conflicted with some Markdown renderers
- Spacing around the `<!-- AI:START -->` / `<!-- AI:END -->` markers was inconsistent, causing extra blank lines or missing separators to accumulate with each run

The root issue was that the replacement logic was manipulating raw strings rather than building the output from a clean structure on every run.

## Decision

Three changes were made:

### 1. Flatten the heading structure

Remove nested subheadings inside the AI section and replace them with bold labels:

```markdown
# Before (problematic)

## AI Generated Summary

### Summary

Content here

### Key Points

- Point 1

# After (stable)

## AI Generated Summary

Content here
**Key Points:**

- Point 1
```

Flat structure avoids heading hierarchy issues and is less likely to cause rendering inconsistencies across different Markdown renderers.

### 2. Build output from an array of lines

Instead of replacing substrings in the existing body, each section of the template is assembled from an array and joined with `\n`:

```typescript
const sections: string[] = [];
sections.push("## AI Generated Summary");
sections.push("");
sections.push(summary);
sections.push("");
if (keyPoints.length > 0) {
  sections.push("**Key Points:**");
  keyPoints.forEach((p) => sections.push(`- ${p}`));
  sections.push("");
}
return sections.join("\n");
```

This guarantees consistent spacing regardless of what the previous body contained.

### 3. Extract content before rebuilding, not after

When replacing the AI section, the formatter:

1. Locates the `<!-- AI:START -->` marker and takes everything before it as the "before" block
2. Extracts Developer Notes and Checklist content separately
3. Assembles a fresh, complete template from the four components: before block, new AI content, extracted notes, extracted checklist

This means the output is structurally identical on every run, not the result of patching the previous output.

## Rationale

String replacement on Markdown is fragile. Minor whitespace differences in the source body can cause regex-based extraction to fail or introduce extra blank lines. Building from an array on every write eliminates an entire class of formatting drift bugs.

The array approach also makes it straightforward to add, remove, or reorder sections in future — changing the template is a matter of editing the array construction code rather than adjusting multiple regex patterns.

### Alternatives considered

| Approach                                             | Reason rejected                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Normalize whitespace around markers after each write | Treats the symptom rather than the cause; fragile to edge cases    |
| Parse the Markdown into a structured AST             | Too complex given the simple, predictable template structure       |
| Keep nested headings and fix spacing manually        | Would require tracking heading depth context, which is error-prone |

## Consequences

**Positive:**

- PR body format is stable across unlimited re-runs
- Template changes are easy to make and test
- Consistent blank lines and section separators in all cases

**Negative:**

- The output format changed from nested headings to flat headings with bold labels — existing PRs that were generated with the old format will not be retroactively updated, but they remain valid and will be replaced on the next PR update

## Related

- [ADR-001: Incremental Diff Processing Strategy](./001-incremental-diff-strategy.md)
