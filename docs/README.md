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
- **Developer Notes** - your custom notes are always preserved ✅
- **Checklist** - your custom items never get overwritten ✅

### Content Preservation
- User-added notes are extracted and preserved on every update
- Custom checklist items stay intact across PR changes
- Only the AI section gets regenerated
- **Zero data loss** guaranteed

### Intelligent Processing
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
