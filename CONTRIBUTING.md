# Contributing to PR Pilot Summary

Thank you for your interest in contributing. This document covers how to report issues, propose features, submit code, and follow the project's standards.

## Code of conduct

Be respectful, inclusive, and constructive in all interactions.

## Ways to contribute

### Report a bug

Open an issue and include:

- A clear, descriptive title
- What happened vs. what you expected
- Steps to reproduce
- Environment details (OS, Node.js version, action configuration)
- Relevant logs (enable `debug: true` in the action if needed)

### Suggest a feature

Open an issue with the `enhancement` label and describe:

- The problem this would solve
- Your proposed solution
- Alternative approaches you considered
- Real-world use cases

### Submit code

See the workflow below.

### Improve documentation

Documentation PRs are welcome. Common targets include:

- `README.md` — user-facing reference
- `DEVELOPMENT.md` — developer-facing guide
- Inline code comments
- Usage examples

## Getting started

### Prerequisites

- Node.js 20 or later
- npm
- Git

### Setup

```bash
# Fork the repository on GitHub, then:

git clone https://github.com/YOUR_USERNAME/prpilot-summary.git
cd prpilot-summary

git remote add upstream https://github.com/bishalprasad321/prpilot-summary.git

npm install

# Create a branch
git checkout -b fix/issue-name
# or
git checkout -b feature/new-feature-name
```

## Development workflow

### Before writing code

1. Check open issues for a `good first issue` label
2. Comment on the issue to indicate you are working on it
3. Discuss your approach before starting significant work

### While coding

```bash
npm run watch          # auto-recompile on file changes

npm run typecheck      # catch type errors early
npm run lint           # check code style
npm run format         # auto-format

npm run build          # full build
npm test               # run tests
```

### Before opening a PR

```bash
npm run typecheck
npm run lint:fix
npm run format
npm run build

git push origin fix/issue-name
# then open a PR on GitHub
```

## Pull request guidelines

### Checklist

Before submitting, verify:

- [ ] `npm run build` completes without errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes (or `lint:fix` was run)
- [ ] `npm run format` was applied
- [ ] Commits have clear, descriptive messages
- [ ] PR title is clear and references the related issue (e.g. `fix: handle empty diff (#42)`)
- [ ] PR description explains what changed and why

### Commit message format

```
type(scope): short description
```

**Types:**

| Type       | When to use                                |
| ---------- | ------------------------------------------ |
| `feat`     | New feature                                |
| `fix`      | Bug fix                                    |
| `refactor` | Code restructuring without behavior change |
| `test`     | Adding or updating tests                   |
| `docs`     | Documentation changes                      |
| `chore`    | Build, dependency, or tooling changes      |
| `perf`     | Performance improvements                   |

**Examples:**

```
feat(github): add support for filtering by file type
fix(llm): handle timeout errors gracefully
refactor(diff-processor): simplify language detection
docs(readme): add troubleshooting section
test(state-manager): add persistence tests
```

### PR description template

```markdown
## What

Brief description of what this PR changes.

## Why

Explanation of the problem this solves or the motivation behind it.

## How

- Key implementation detail 1
- Key implementation detail 2

## Testing

How you tested this change.

## Breaking changes

None / describe any breaking changes.

## Related issues

Closes #123
```

## Code standards

See [DEVELOPMENT.md](DEVELOPMENT.md#code-standards) for the full reference.

**Quick summary:**

- TypeScript strict mode is always enabled
- No `any` types — use `unknown` and narrow, or create a proper interface
- Always declare return types on functions
- Use `camelCase` for variables and functions, `PascalCase` for classes and interfaces
- Use the `logger` utility, not `console.log` directly
- Document _why_, not _what_ — the code already shows what

## Testing

Run the full test suite:

```bash
npm test
```

Run with coverage:

```bash
npm test -- --coverage
```

When adding a new module or feature, create a corresponding test file:

```typescript
import { MyClass } from "../src/path/to/module";

describe("MyClass", () => {
  it("should behave as expected", () => {
    const instance = new MyClass();
    expect(instance.method()).toEqual("expected result");
  });
});
```

## Documentation

If your change affects users, update `README.md` (features list, inputs table, examples, troubleshooting).

If your change affects the development setup or architecture, update `DEVELOPMENT.md`.

## Code review

Reviewers check for:

- Code quality and adherence to standards
- Test coverage for new logic
- Clear and complete documentation
- No performance regressions
- No new security vulnerabilities

When responding to review comments, update the code and commit the changes. Re-request review once you're done.

## Release process

Releases are made by maintainers:

1. Bump the version in `package.json` and `action.yml`
2. Update `CHANGELOG.md`
3. `git commit -am "chore: release v1.2.3"`
4. `git tag v1.2.3`
5. `git push origin main --tags`
6. Create a GitHub Release from the tag

## Recognition

Contributors are listed on the GitHub contributors page and credited in release notes.

## Questions

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for technical details
- Comment on the relevant issue
- Email: bishalprasad321@gmail.com

## License

By contributing, you agree that your code will be licensed under the MIT License.
