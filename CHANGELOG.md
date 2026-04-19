# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Smart Content Preservation**: Automatically extract and preserve user-written PR descriptions to Developer Notes section
- **Dynamic Checklist Generation**: Auto-generate and intelligently check PR checklist items based on file changes:
  - ✅ Tests added (when test files are modified)
  - ✅ Documentation updated (when markdown/doc files are modified)
  - ⬜ Configuration validated (when config files are modified)
  - ⬜ Performance reviewed (for large diffs >500 changes)
  - ⬜ Breaking changes documented (for large deletions >100 lines)
- **Workflow Refactoring**: Separated monolithic GitHub Actions workflow into 3 purpose-driven workflows:
  - `ci.yml`: Fast core quality checks (required, ~2-3 min)
  - `action-test.yml`: Integration testing (optional, ~1-2 min)
  - `security.yml`: Scheduled security audits (weekly, ~1-2 min)
- Enhanced documentation with smart features explanation
- Updated PR template with all checklist items
- Job outputs pattern for secure secrets handling in GitHub Actions

### Changed

- Improved `replaceAISection()` method to accept optional file list for dynamic checklist generation
- Enhanced formatter with intelligent content extraction and merging
- Updated documentation (README, DEVELOPMENT, API, Architecture, QUICKSTART) to reflect new features

### Deprecated

- Monolithic GitHub Actions workflow pattern (use separate workflows by concern instead)

### Removed

### Fixed

- VSCode type errors in formatter.test.ts by adding Jest type reference

### Security

- Implemented job outputs pattern for secrets checking in GitHub Actions workflows (safer than environment variables)

---

## [1.0.0] - 2024-04-09

### Added

- Initial stable release
- Full 14-step orchestration for PR description generation
- Multi-language code diff analysis
- AI-powered PR documentation
- Incremental diff processing for large changes
- Idempotent processing with state persistence
- Safe PR body updates preserving developer notes
- Error handling with graceful fallbacks
- Support for GPT-4, GPT-4-Turbo, GPT-4o-mini models
- Comprehensive test suite
- Complete documentation

### Initial Features

- ✅ AI-powered PR analysis using GPT
- ✅ Incremental processing for efficiency
- ✅ Safe updates (never overwrites developer notes)
- ✅ Idempotent execution (won't reprocess commits)
- ✅ Smart filtering (ignores build artifacts, lock files)
- ✅ Multi-language support (20+ languages)
- ✅ Comprehensive output (summary, key points, highlights)
- ✅ Graceful error handling

---

## Future Roadmap

### Planned Features

- [ ] Support for other LLMs (Anthropic, Cohere, local models)
- [ ] Custom prompt templates
- [ ] Webhook integration for external CI/CD
- [ ] Database support for state persistence (vs local file)
- [ ] Batch processing for monorepos
- [ ] Custom language detection rules
- [ ] Token usage tracking and cost reporting
- [ ] PR classification (feature, bugfix, refactor, etc.)
- [ ] Integration with project management tools (Jira, Linear, etc.)
- [ ] Custom output formatting

### Under Consideration

- [ ] Support for multiple PR description formats
- [ ] A/B testing for different LLM models
- [ ] Comment suppression rules
- [ ] Language-specific analysis rules
- [ ] Performance benchmarking dashboard

---

## [0.0.1] - 2024-04-01

### Added

- Project scaffolding
- Initial architecture design
- Core module interfaces
