---
applyTo: "**/*.js"
---

# JavaScript Code Style Guide

## Language Features

<!-- ES6 language features here. We can't use this yet, so I am commenting them out so the AI doesn't use 'em.
- Use `const` for variables that do not change.
- Use `let` for variables that may change.
- Use `var` only when necessary, such as for function-scoped variables.
- Use arrow functions for anonymous functions.
- Use destructuring for objects and arrays when applicable.
- Use `async/await` for asynchronous code instead of callbacks or `.then()` chains.
- Use `for...of` for iterating over arrays and `for...in` for iterating over object properties.
- Use `import` and `export` for module management instead of `require` and `module.exports`.
- Use `Object.assign()` or the spread operator (`...`) for shallow cloning objects.
- Use `Array.from()` or the spread operator (`...`) for converting iterable objects to arrays.
- Use `Map` and `Set` for collections that require unique keys or values.
-->

- Do **not** use any ES6 features. Only use ES5 features.
- Use `null` for intentional absence of value.
- Use `undefined` for uninitialized variables.
- Use `Object.freeze()` to make objects immutable when necessary.
- Use `Promise.all()` for running multiple promises in parallel.
- Use `Symbol` for unique identifiers.

## Naming Conventions

- Use `camelCase` for variable and function names.
- Use `PascalCase` for class names.
- Use `UPPER_SNAKE_CASE` for constants.
- Use descriptive names that convey the purpose of the variable or function. Do not be overly verbose.
- Use singular nouns for variables that represent a single item and plural nouns for collections.
- Use prefixes like `is`, `has`, `can`, or `should` for boolean variables to indicate their purpose.
- Use suffixes like `Handler`, `Service`, or `Controller` for classes that handle specific tasks or logic.
- Use `on` prefix for event handler functions (e.g., `onClick`, `onChange`).
- Use `create`, `update`, `delete`, or `fetch` prefixes for functions that perform CRUD operations.
- Use `init` or `initialize` for functions that set up initial state or configuration.
- Use `get` and `set` prefixes for accessor and mutator methods.
- Use `handle` for functions that process events or actions.
- Use `validate` for functions that check data integrity or correctness.
- Use `transform`, `map`, or `convert` for functions that change data formats or structures.
- Use `find`, `filter`, or `sort` for functions that search or manipulate collections.

## Code Style

- Use 2 spaces for indentation. Do **not** use tabs.
- Use semicolons at the end of statements.
- Use single quotes for strings. <!-- , except when using template literals. -->
- Use spaces around operators and after commas.
- Use spaces after keywords like `if`, `for`, `while`, etc.
- Use line breaks to separate logical blocks of code.
- Use comments to explain complex logic or important decisions.
- Use JSDoc comments for documenting functions, classes, and modules.
- Use `//` for single-line comments and `/* ... */` for multi-line comments.
- Use consistent line length (preferably 80-120 characters).
- Use trailing commas in multi-line objects and arrays for easier version control diffs.
- Use `===` and `!==` for strict equality checks to avoid type coercion issues.
- Use `try...catch` for error handling in asynchronous code.
- Use `eslint` and `prettier` for code formatting and linting to ensure consistency across the codebase.
