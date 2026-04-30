# PR Pilot Summary Documentation

Comprehensive documentation for PR Pilot Summary - the intelligent PR description generator with content preservation.

## Contents

- **[ADRs](./adr/)** - Architecture Decision Records documenting major design decisions
- **[API Documentation](./api.md)** - Detailed API reference, template format, and behavior
- **[Architecture](./architecture.md)** - System architecture, data flow, and module design
- **[Contributing Guide](../CONTRIBUTING.md)** - Guidelines for contributing to this project

## Quick Links

- 📋 [GitHub Action Setup](../README.md#installation)
- 📌 [PR Template Guide](./api.md#pr-template-format--behavior)
- 🔧 [Development Guide](../DEVELOPMENT.md)
- 🚀 [Quick Start](../QUICKSTART.md)
- 📝 [Changelog](../CHANGELOG.md)

## Key Features

### Complete PR Template

Generates a professional template with:

- **Summary** section for overview
- **AI Generated Summary** with key points and highlights
- **Developer Notes** - user descriptions are extracted and preserved ✅
- **Generic Checklist** - documentation checkbox auto-generated from `*.md` file changes ✅

### Smart Content Preservation

- **Extracts user descriptions** - If you write a description before action runs, it's saved to Developer Notes
- **Preserves all edits** - Custom checklist items and notes stay intact across PR changes
- **Intelligent merging** - Raw descriptions are merged with existing dev notes
- **Only AI section regenerates** - Other content is never touched
- **Zero data loss** guaranteed

### Generic Checklist

Automatically generates a project-agnostic checklist item based on files changed:

- ✅ Documentation updated / modified (checked only when `*.md` files changed)

### Intelligent Processing

- Groq, Gemini, OpenAI, and OpenAI-compatible provider support
- Multi-language diff analysis (20+ languages)
- Smart filtering (removes noise, keeps code)
- Incremental processing for efficiency
- Idempotent updates (safe to run multiple times)

## ADRs

Architecture Decision Records capture important design decisions made during development. They include:

- Context and problem statement
- Considered alternatives
- Decision and rationale
- Consequences

See the [ADR directory](./adr/) for all recorded decisions.

## Getting Help

- 📚 [API Documentation](./api.md) - Complete reference with examples
- 🏗️ [Architecture Guide](./architecture.md) - Deep dive into system design
- 🐛 [GitHub Issues](https://github.com/bishalprasad321/prpilot-summary/issues) - Report bugs
- 💬 [Discussions](https://github.com/bishalprasad321/prpilot-summary/discussions) - Ask questions
