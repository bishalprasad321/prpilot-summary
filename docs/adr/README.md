# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the AI PR Description Generator.

## Overview

ADRs document significant architectural and design decisions made during the development of this project. Each ADR should explain the context, decision made, and the reasoning behind it.

## ADR Format

Each ADR follows this template:

```
# ADR-XXX: [Short Title]

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context

Describe the issue or problem that motivated this decision.

## Decision

Explain the decision that was made.

## Rationale

Explain why this decision was made and what alternatives were considered.

## Consequences

Describe the positive and negative consequences of this decision.

## Related

- Link to related issues, PRs, or other ADRs
```

## Current ADRs

- [ADR-001: Incremental Diff Processing Strategy](./001-incremental-diff-strategy.md) - Strategy for handling large diffs with incremental processing

## Guidelines

1. Create a new ADR when making significant architectural decisions
2. Number ADRs sequentially (001, 002, etc.)
3. Use clear, descriptive titles
4. Document decisions as early as possible
5. Keep ADRs concise but complete
6. Reference related issues and PRs

For more information on ADRs, see [Architectural Decision Records](https://adr.github.io/)
