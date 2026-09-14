# Contributing

Thanks for considering contributing to this project. Ways you can help:

- [Create a pull request](https://help.github.com/articles/creating-a-pull-request)
- [Add an issue](https://github.com/braintree/braintree-web/issues)

## Branch Naming Convention

All branch names must follow one of these formats:

1. **Standard format**: lowercase kebab-case with optional version suffix
2. **Jira format**: JIRA-TICKET-lowercase-kebab-case with optional version suffix

This convention is enforced both locally (via Git hooks) and on GitHub (via CI checks).

### Valid Branch Names

**Standard format:**

- `feature-name`
- `fix-payment-bug`
- `update-dependencies`
- `refactor-auth-module`
- `add-new-endpoint`
- `beta.1` (beta branch with version)
- `release-candidate.2` (versioned release candidate)

**With Jira ticket prefix:**

- `DTBTWEB-123-fix-payment-bug` (Jira ticket + description)
- `PAYPL-1234-add-new-feature`
- `ABC-99-hotfix.1` (Jira ticket + version)
- `DTBTWEB-256-some-amazing-feature`

### Invalid Branch Names

- `FeatureName` (uppercase without Jira prefix)
- `feature_name` (uses underscores instead of hyphens)
- `feature name` (contains spaces)
- `Feature-Name` (uppercase without proper Jira format)
- `feature.name` (period without number at the end)
- `dtbtweb-123-feature` (lowercase Jira prefix - must be uppercase)
- `DTBTWEB123-feature` (missing hyphen in Jira ticket number)
- `DTBTWEB-feature` (Jira prefix missing ticket number)

### Validation

Branch names are automatically validated:

- **Locally**: When you attempt to push (via pre-push hook)
- **On GitHub**: When you create a pull request or new branch

To manually validate a branch name, run:

```sh
node scripts/hooks/validate-branch-name.js "your-branch-name"
```

### Committing

This repository uses the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) structure for commits.

You can run

```bash
npm run commit
```

to run an interactive wizard that will help you build the expected style. At a high level:

**Conventional commit format:** `type(scope): subject`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `dx`, `ci`, `chore`, `revert`

**Scopes:** match component names (`client`, `hosted-fields`, `three-d-secure`, etc.) plus `deps` and `other`

**Rules:**

- Scope is optional but recommended (warning if omitted)
- Subject max length: 85 characters
- Body and footer lines max: 100 characters

## Development

Clone this repo, then install the project's development dependencies:

```sh
npm install
```

After installing dependencies, enable Git hooks (commit linting, branch name validation, etc.):

```sh
npx husky
```

This step is needed because `ignore-scripts=true` in `.npmrc` prevents the `prepare` script from running automatically.

Read our [development guidelines](DEVELOPMENT.md) to get a sense of how we think about working on this codebase.

## Environments

The architecture of the Client API means that you'll need to develop against a merchant server when developing braintree-web. The merchant server uses a server side client library such as [`braintree_node`](https://github.com/braintree/braintree_node) to coordinate with a particular Braintree Gateway environment. The various Gateway environments, such as `development`, `sandbox` and `production`, in turn determine the specific behaviors around merchant accounts, credit cards, PayPal, etc.

## Tests

Use `npm test` to run tests, `npm run jsdoc` to generate docs, or `npm run build` to transpile into `dist/`. To view available npm tasks:

```sh
npm run
```

### Test Stability, Quarantine & Remediation Policy

Flaky tests are any test that passes and fails intermittently without code changes(this could be due to things like timeouts, inconsistent return values, poor assertions, etc). Flaky tests erode confidence in the test suite and slow down development. This section defines how we detect, quarantine, and remediate them.

#### Detection

- **Automatic retries**: Both Jest unit tests and Playwright integration tests are automatically retried on failure. Jest retries each failing test up to 2 times (`jest.retryTimes(2)`), and Playwright retries are configured per-project in the Playwright config. A test that fails once but passes on retry can be considered as potentially flaky.
- **Rerunning failed Playwright tests locally**: Use `npm run test:playwright:last-failed` to rerun only the Playwright tests that failed in the previous run. This is useful for quickly verifying fixes to flaky or broken integration tests without rerunning the entire suite.
- **Repeat failures**: If a test fails intermittently across multiple CI runs or PRs, it should be reported by opening a GitHub issue or Jira ticket with the label `flaky-test`. Include the test name, file path, failure frequency, and any relevant error output.

#### Quarantine

When a test is confirmed flaky:

1. **Open a tracking issue** in GitHub Issues or Jira. Use the `flaky-test` label and include:
   - Test file path and test name
   - Observed failure rate and pattern (e.g., "fails ~10% of runs", "only on Safari")
   - Stack trace or error message
2. **Skip the test** using `.skip` and add a comment referencing the tracking issue or ticket:

   ```javascript
   // Quarantined: upstream service unreliable (https://github.com/braintree/braintree-web/issues/123)
   it.skip("should handle the edge case", function () {
     // ...
   });
   ```

   For `describe` blocks with multiple flaky tests, you may quarantine the entire block:

   ```javascript
   // Quarantined: upstream service unreliable (DTBTWEB-456)
   describe.skip("feature under investigation", function () {
     // ...
   });
   ```

3. **Skipped tests are excluded from coverage reporting.** Since quarantined tests do not execute, their associated source code is not counted toward coverage metrics. This is expected and acceptable while the test is in quarantine.

#### Remediation SLA

Quarantined tests must be remedied within **30 days** of being quarantined. Remediation means one of the following:

- **Fixed**: The root cause is identified and corrected, the `.skip` is removed, and the test passes reliably.
- **Deleted**: If the test is no longer valuable or the feature it covers has changed, delete the test and close the tracking issue.

If a quarantined test exceeds the 14-day SLA, it should be escalated and prioritized in the next sprint. Tests that remain skipped indefinitely are not acceptable.
