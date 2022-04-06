# Contributing

Thanks for considering contributing to this project. Ways you can help:

- [Create a pull request](https://help.github.com/articles/creating-a-pull-request)
- [Add an issue](https://github.com/braintree/braintree-web/issues)

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
