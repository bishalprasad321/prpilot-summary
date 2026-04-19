# GitHub Actions Workflows

This directory contains the CI/CD workflows for the **prpilot-summary** action. Each workflow serves a specific purpose to ensure code quality, integration testing, and security monitoring.

## Workflows Overview

### 1. **ci.yml** - Core Checks (Required)

**Trigger**: Every push and pull request  
**Status**: ✅ Must pass before merge  
**Duration**: ~2-3 minutes  
**Purpose**: Fast feedback loop for code quality

**What it does:**

- ✓ Type checking (`npm run typecheck`)
- ✓ Linting (`npm run lint`)
- ✓ Format checking (`npm run format:check`)
- ✓ Unit tests (`npm test`)
- ✓ Build bundle (`npm run build`)
- ✓ Verify action artifact (`dist/index.js`)
- ✓ Ensure dist is up to date

**Why this order:**

1. Quick syntax checks (typecheck, lint) fail fast
2. Format check (code style)
3. Unit tests (logic correctness)
4. Build (integration of all modules)
5. Verify final artifact

---

### 2. **action-test.yml** - Integration Tests (Optional)

**Trigger**: Pull requests and manual (`workflow_dispatch`)  
**Status**: ⚠️ Optional (doesn't block merge if secrets missing)  
**Duration**: ~1-2 minutes  
**Purpose**: Test the action in a realistic scenario

**What it does:**

- Checks if `GEMINI_API_KEY` secret is configured
- Skips action execution if secrets are missing (gracefully)
- Logs execution results and outcomes
- Auto-comments on PR if action fails due to missing secrets
- Ideal for catching integration issues before code review

**Behavior:**

- ✅ If `GEMINI_API_KEY` is set: Runs the action and tests with real LLM
- ⏭️ If `GEMINI_API_KEY` is missing: Skips action and posts helpful comment
- 📝 Always logs execution status for debugging

**When to use:**

- After local development
- Before requesting code review
- To verify action behavior with real LLM

**Requirements:**

- `GEMINI_API_KEY` secret configured in repo
- Requires `workflow_dispatch` permissions for manual runs

---

### 3. **security.yml** - Scheduled Security Audit (Optional)

**Trigger**: Weekly (Monday 9 AM UTC) or manual  
**Status**: ⚠️ Optional (doesn't block anything)  
**Duration**: ~1-2 minutes  
**Purpose**: Monitor dependencies for vulnerabilities

**What it does:**

- `npm audit` (moderate severity level)
- Dependency funding info
- SLSA provenance generation (for release integrity)

**When to run:**

- Automatically: Every Monday morning
- Manually: `workflow_dispatch` for on-demand checks

**Note**: Non-blocking failure - useful for monitoring but doesn't prevent merges

---

## Workflow Execution Flow

```
User pushes code or creates PR
        ↓
    ✅ ci.yml runs (MANDATORY)
        ├─ Type check
        ├─ Lint & format
        ├─ Unit tests
        ├─ Build bundle
        └─ Verify artifacts

    If PR: ⚠️ action-test.yml runs (OPTIONAL)
        └─ Test action on PR with LLM

    If Monday 9 AM: ⚠️ security.yml runs (OPTIONAL)
        └─ Audit dependencies
```

---

## Best Practices

### For Contributors

1. **Before pushing**:

   ```bash
   npm run typecheck   # Catch type errors early
   npm run lint        # Follow code standards
   npm run format      # Auto-format code
   npm test            # Verify unit tests
   npm run build       # Ensure bundling works
   ```

2. **For integration testing**:
   - Ensure `GEMINI_API_KEY` is in secrets
   - Manually trigger `action-test.yml` with `workflow_dispatch`
   - Check PR for AI-generated description

3. **For security issues**:
   - Monitor `security.yml` results
   - Fix high/critical vulnerabilities immediately
   - Update dependencies regularly

### For Maintainers

1. **Monitoring**:
   - Check `security.yml` weekly reports
   - Review dependency health
   - Keep Node.js version current (20.x)

2. **Updating workflows**:
   - Keep individual workflows focused
   - Avoid adding unrelated jobs
   - Document any changes in this README

3. **Secrets management**:
   - `GITHUB_TOKEN` - Auto-provided by GitHub
   - `GEMINI_API_KEY` - Add manually in Settings → Secrets
   - Never commit secrets or API keys

---

## Troubleshooting

### "ci.yml fails on dist check"

**Solution**: Run `npm run build` locally and commit the updated `dist/` files.

```bash
npm run build
git add dist/
git commit -m "chore: update dist bundle"
git push
```

### "action-test.yml shows warning about secrets"

**Why**: The action checks if `GEMINI_API_KEY` is configured and gracefully skips if missing.

**Solution**: Add `GEMINI_API_KEY` to repo secrets (optional for action-test to work).

1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `GEMINI_API_KEY`, Value: your key from [Google AI Studio](https://aistudio.google.com/apikey)
4. Save and re-run workflow

**If you don't add secrets**:

- ✅ The action test still runs (doesn't fail the build)
- ✅ Action step is skipped gracefully
- ✅ PR gets a helpful comment about missing secrets
- ✅ No blocking errors

### "Tests pass locally but fail in CI"

**Solution**: This is usually platform-specific (Windows vs Linux). Try:

```bash
# Run on Ubuntu (GitHub's runner OS)
npm test -- --runInBand
npm run typecheck
npm run lint
```

### "Security audit shows vulnerabilities"

**Solution**: Fix or ignore based on severity.

```bash
# Audit and fix automatically
npm audit fix

# Check what would be fixed
npm audit fix --dry-run

# For low-risk issues, can use --force
npm audit fix --force
```

---

## CI/CD Pipeline Summary

| Workflow          | Trigger         | Blocking | Duration | Purpose             |
| ----------------- | --------------- | -------- | -------- | ------------------- |
| `ci.yml`          | Push + PR       | ✅ Yes   | 2-3 min  | Core quality checks |
| `action-test.yml` | PR + manual     | ❌ No    | 1-2 min  | Integration testing |
| `security.yml`    | Weekly + manual | ❌ No    | 1-2 min  | Dependency audit    |

---

## Technical Details

### action-test.yml Secrets Handling

The workflow uses a smart two-step approach:

**Step 1: Check Secrets**

```bash
if [ -z "${{ secrets.GEMINI_API_KEY }}" ]; then
  echo "has_key=false" >> $GITHUB_OUTPUT
else
  echo "has_key=true" >> $GITHUB_OUTPUT
fi
```

**Step 2: Conditional Execution**

```yaml
- name: Execute prpilot-summary Action
  if: steps.check_secrets.outputs.has_key == 'true'
  uses: ./
```

**Result**:

- ✅ Action runs only if secrets are configured
- ✅ No error comments posted if secrets missing
- ✅ Graceful skip without workflow failure
- ✅ VSCode linting warnings eliminated (uses job outputs)

### Job Outputs vs Environment Variables

This workflow uses **job outputs** (`$GITHUB_OUTPUT`) instead of environment variables (`$GITHUB_ENV`) for secrets checking because:

| Feature         | Job Outputs | Env Variables             |
| --------------- | ----------- | ------------------------- |
| Type-safe       | ✅ Yes      | ❌ No                     |
| IDE recognition | ✅ Yes      | ❌ No                     |
| VSCode warnings | ✅ None     | ❌ "Unrecognized context" |
| Best practice   | ✅ Yes      | ⚠️ For env only           |

---

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides)
- [Concurrency Control](https://docs.github.com/en/actions/using-jobs/using-concurrency)
