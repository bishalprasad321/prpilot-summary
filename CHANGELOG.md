# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Groq LLM provider support using Groq's OpenAI-compatible chat completions API
- Default Groq model set to `openai/gpt-oss-120b`
- Separate Groq integration workflow using `secrets.GROQ_API_KEY`
- **Smart Content Preservation**: Automatically extract and preserve user-written PR descriptions to Developer Notes section
- **Generic Checklist Generation**: Auto-generate a project-agnostic documentation checkbox:
  - ✅ Documentation updated / modified (checked only when `*.md` files are modified)
- **Workflow Refactoring**: Separated monolithic GitHub Actions workflow into 3 purpose-driven workflows:
  - `ci.yml`: Fast core quality checks (required, ~2-3 min)
  - `action-test.yml`: Integration testing (optional, ~1-2 min)
  - `security.yml`: Scheduled security audits (weekly, ~1-2 min)
- Enhanced documentation with smart features explanation
- Updated PR template with all checklist items
- Job outputs pattern for secure secrets handling in GitHub Actions

### Changed

- Improved `replaceAISection()` method to accept optional file list for generic checklist generation
- Enhanced formatter with intelligent content extraction and merging
- Updated documentation (README, DEVELOPMENT, API, Architecture, QUICKSTART) to reflect new features

### Deprecated

- Monolithic single-workflow pattern — use the separate purpose-scoped workflows instead

### Fixed

- VSCode type errors in `formatter.test.ts` resolved by adding the Jest type reference

### Security

- Secrets checking in integration workflows now uses job outputs (`$GITHUB_OUTPUT`) rather than environment variables, eliminating potential secret exposure in workflow logs

---

## [1.0.0] - 2026-04-21

### Added

- Initial stable release
- 14-step orchestration pipeline for PR description generation
- Multi-language code diff analysis (20+ languages)
- AI-powered PR documentation with summary, key points, and highlights
- Incremental diff processing with automatic fallback to full diff
- Idempotent execution using commit SHA state persistence
- Safe PR body updates that preserve developer notes and checklist content
- Graceful error handling — action never breaks the PR on failure
- Support for GPT-4, GPT-4-Turbo, and GPT-4o-mini models
- Unit and integration test suite
- Full documentation

---

## Future roadmap

### Planned

- [ ] Support for additional providers (Anthropic, Cohere, local models via Ollama)
- [ ] Custom prompt templates via action inputs
- [ ] Webhook integration for external CI/CD systems
- [ ] Persistent state storage options (GitHub artifacts, external database)
- [ ] Batch processing support for monorepos
- [ ] Custom language detection rules
- [ ] Token usage tracking and cost estimation output
- [ ] PR classification (feature, bugfix, refactor, chore)
- [ ] Integration with project management tools (Jira, Linear)
- [ ] Custom output formatting

### Under consideration

- [ ] Multiple PR description format presets
- [ ] A/B testing across LLM providers
- [ ] Comment suppression rules
- [ ] Language-specific diff analysis rules
- [ ] Performance benchmarking output

---

## [0.0.1] - 2026-04-01

### Added

- Project scaffolding
- Initial architecture design
- Core module interface definitions
