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

```bash
node scripts/validate-branch-name.js "your-branch-name"
```

## Development

Clone this repo, then install the project's development dependencies:

```
npm install
```

Read our [development guidelines](DEVELOPMENT.md) to get a sense of how we think about working on this codebase.

## Environments

The architecture of the Client API means that you'll need to develop against a merchant server when developing braintree-web. The merchant server uses a server side client library such as [`braintree_node`](https://github.com/braintree/braintree_node) to coordinate with a particular Braintree Gateway environment. The various Gateway environments, such as `development`, `sandbox` and `production`, in turn determine the specific behaviors around merchant accounts, credit cards, PayPal, etc.

## Tests

Use `npm test` to run tests, `npm run jsdoc` to generate docs, or `npm run build` to transpile into `dist/`. To view available npm tasks:

```
npm run
```
