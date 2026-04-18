# ADR-002: Markdown Structure Preservation on Re-processing

## Status

Accepted

## Context

When a PR is updated multiple times, the AI-generated description section is replaced. However, the markdown structure was degrading with each update:

- Sections were squishing together
- Nested heading structure caused formatting issues
- Whitespace management was inconsistent

The core problem: nested markdown structure (`##` heading followed by `###` subheadings) combined with improper spacing around replacement markers.

## Decision

### 1. Flatten Markdown Structure

Remove nested heading hierarchy:

```markdown
❌ Before (problematic):
## 🤖 AI Generated Summary
### Summary
Content here
### Key Points
- Point 1

✅ After (clean):
## 🤖 AI Generated Summary

Content here

**Key Points:**
- Point 1
```

### 2. Implement Array-Based Section Building

```typescript
const sections: string[] = [];
sections.push("## 🤖 AI Generated Summary");
sections.push("");
sections.push(summary);
sections.push("");
// ... add other sections
return sections.join("\n");
```

Benefits:
- Guaranteed consistent spacing
- Easy to maintain section order
- Clear section boundaries

### 3. Enforce Proper Spacing Around Markers

```typescript
// In replaceSection():
const before = body.substring(0, startIdx).trimEnd();
const after = body.substring(endIdx + AI_SECTION_END.length).trimStart();

// Ensure 2-newline spacing
result += "\n\n"; // Before marker
result += AI_SECTION_START + "\n" + newContent + "\n" + AI_SECTION_END;
result += "\n\n"; // After marker
```

## Rationale

### Why Array-Based Approach?

1. **Predictability**: Arrays guarantee order and structure
2. **Maintainability**: Adding/removing sections is straightforward
3. **Debuggability**: Easy to see exact spacing and ordering

### Why Flattened Structure?

1. **Simplicity**: No nested heading complexity
2. **Consistency**: Works well with Markdown parsers
3. **Stability**: Resistant to formatting degradation

### Why Explicit Spacing?

1. **Prevents Squishing**: Consistent spacing prevents text collision
2. **Professional Look**: Two blank lines between major sections is standard
3. **Multiple Updates**: Survives repeated replacements

## Consequences

### Positive

✅ Markdown remains valid across multiple updates  
✅ Clean, professional appearance  
✅ Resistant to whitespace degradation  
✅ Easy to maintain and extend  
✅ Consistent with Markdown best practices  

### Negative

⚠️ Output format changed from nested to flat structure  
⚠️ May require documentation updates for users expecting old format  

## Migration Path

- Old PRs: Still valid, just different formatting
- New PRs: Will use clean format
- No breaking changes to PR functionality

## Related

- Issue: Markdown structure degradation on re-processing
- PR: After re-processing PR summary, action deviating from quality of .md structure
- [ADR-001: Incremental Diff Processing Strategy](./001-incremental-diff-strategy.md)
