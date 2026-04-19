# Contributing to PR Pilot Summary

Thank you for your interest in contributing! This document provides guidelines and instructions.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Ways to Contribute

### 1. Report Bugs

Found a bug? Create an issue with:

- **Title**: Clear, descriptive title
- **Description**: What happened vs. expected
- **Steps to Reproduce**: Exact steps to trigger the bug
- **Environment**: OS, Node version, action configuration
- **Logs**: Include relevant logs (enable debug mode if needed)

### 2. Suggest Features

Have an idea? Open an issue with label `enhancement`:

- **Problem**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternative Approaches**: Other ways to solve it?
- **Use Cases**: Real-world examples

### 3. Submit Code

### 4. Improve Documentation

Documentation PRs are very welcome! Improve:

- README.md (user-facing)
- DEVELOPMENT.md (developer-facing)
- Inline comments
- Examples

## Getting Started

### Prerequisites

- Node.js 16+ (check with `node --version`)
- npm or yarn
- Git

### Setup for Contributing

```bash
# 1. Fork the repository
# Go to https://github.com/bishalprasad321/prpilot-summary
# Click "Fork"

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/prpilot-summary.git
cd prpilot-summary

# 3. Add upstream remote
git remote add upstream https://github.com/bishalprasad321/prpilot-summary.git

# 4. Install dependencies
npm install

# 5. Create a branch
git checkout -b fix/issue-name
# or
git checkout -b feature/new-feature-name
```

## Development Workflow

### Before You Start Coding

1. **Check issues**: Look for `good first issue` labels
2. **Comment on issue**: Say "I'd like to work on this"
3. **Discuss approach**: Get feedback before major work

### While Coding

```bash
# 1. Run in watch mode
npm run watch

# 2. Keep code quality high
npm run typecheck
npm run lint
npm run format

# 3. Test your changes locally
npm run build
npm test  # if tests exist

# 4. Write clear commit messages
git add .
git commit -m "feat: add incremental diff support"
# Use: feat, fix, refactor, test, docs, chore
```

### Before Submitting PR

```bash
# 1. Final quality check
npm run typecheck
npm run lint:fix
npm run format
npm run build

# 2. Push to your fork
git push origin fix/issue-name

# 3. Create PR on GitHub
# Fill in the PR template completely
```

## PR Guidelines

### Checklist

Before submitting, ensure:

- [ ] Builds successfully: `npm run build`
- [ ] Types check: `npm run typecheck`
- [ ] Lint passes: `npm run lint` (or use `lint:fix`)
- [ ] Code formatted: `npm run format`
- [ ] Commits are clear and descriptive
- [ ] PR title is clear and references issue (#123)
- [ ] PR description explains what and why

### Commit Messages

Format: `type(scope): description`

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code reorganization (no behavior change)
- `test`: Add/update tests
- `docs`: Documentation updates
- `chore`: Build, dependencies, tooling
- `perf`: Performance improvements

**Examples**:

```
feat(github): add support for filtering by file type
fix(llm): handle timeout errors gracefully
refactor(diff-processor): simplify language detection
docs(readme): add troubleshooting section
test(state-manager): add persistence tests
```

### PR Description

Include:

- **What**: What changes were made?
- **Why**: Why are these changes needed?
- **Testing**: How was this tested?
- **Breaking Changes**: Any BC or migrations needed?
- **Related Issues**: Fixes #123

**Template**:

```markdown
## What

Adds support for custom LLM providers (not just OpenAI)

## Why

Users with Anthropic/other API keys could not use this action

## How

- Extract LLM logic into interface
- Create LLMProvider base class
- Implement OpenAIProvider and AnthropicProvider
- Add provider input to action.yml

## Testing

- Manual test with Anthropic API key
- Existing tests still pass

## Breaking Changes

None

## Closes

#456
```

## Code Standards

See [DEVELOPMENT.md](DEVELOPMENT.md#code-standards) for detailed standards.

**Quick Reference**:

- Use TypeScript strict mode (enabled by default)
- No `any` types
- Always specify return types
- Use camelCase for variables
- Use PascalCase for classes
- Document **why**, not **what**
- Use logger, not console.log

## Testing

### Run Tests

```bash
npm test
```

### Write Tests

Create `src/modules/module.test.ts`:

```typescript
import { ModuleClass } from "./module";

describe("ModuleClass", () => {
  it("should do something", () => {
    const instance = new ModuleClass();
    expect(instance.method()).toEqual("result");
  });
});
```

### Coverage

```bash
npm test -- --coverage
```

## Documentation

### Update README

If your feature affects users:

- Add to Features section
- Update Inputs/Outputs tables
- Add example usage
- Update Troubleshooting if needed

### Update DEVELOPMENT.md

If your changes affect developers:

- Document the new module/pattern
- Add troubleshooting section
- Update architecture diagram if needed

## Code Review

### What Reviewers Look For

- ✅ Code quality (follows standards)
- ✅ Tests (coverage for new code)
- ✅ Documentation (clear and complete)
- ✅ Performance (no regressions)
- ✅ Security (no vulnerabilities)
- ✅ UX (action easy to use)

### Responding to Feedback

- Be open to suggestions
- Ask for clarification if needed
- Update code and commit changes
- Re-request review when ready

## Release Process

Only maintainers can release, but here's how:

1. Bump version: `package.json`, `action.yml`
2. Update CHANGELOG.md
3. Commit: `git commit -am "chore: v1.2.3"`
4. Tag: `git tag v1.2.3`
5. Push: `git push origin main --tags`
6. Create Release on GitHub

## Recognition

Contributors are recognized in:

- GitHub contributors page
- ACKNOWLEDGMENTS.md (if created)
- Release notes

## Questions?

- 📖 Read DEVELOPMENT.md for technical details
- 💬 Comment on the issue
- 📧 Email: bishalprasad321@gmail.com

## License

By contributing, you agree your code is licensed under MIT.

Thank you for contributing! 🎉
