# General Instructions for Copilot

## Mandatory Planning Phase

- **Planning Phase**: Before writing any code, always start with a planning phase.
  - Your plan must include:
    - A high-level overview of the problem to be solved.
    - All functions, sections, and files that need modification or creation.
    - The order in which changes will be applied.
    - A breakdown of the solution into smaller, manageable components.
    - Consideration of edge cases and error handling.
    - Definition of expected input and output for each function.

## Response Format

- **Response Structure**: Always structure your response in a clear and organized manner.
  - Use headings and subheadings to separate different sections.
  - Use bullet points or numbered lists for clarity.
  - Include code snippets where necessary, ensuring they are properly formatted.
  - Provide explanations for complex logic or decisions made in the code.
  - Do **not** include any emojis or informal language in your responses.

## Terminal Usage

- If possible, avoid using the terminal for tasks you can handle in other ways including but not limited to:
  - Creating files
  - Creating directories
- When using `git` commands that produce large output (like diff or log), always use `--no-pager` so you can easily read the response.
- Never use `sudo`.
  - If `sudo` is required, print the command in a code block and let the human manually run it.

## General Coding Guidelines

### Write Clean and Readable Code

- Follow clear, consistent naming conventions (snake_case, camelCase, PascalCase) depending on language standards.
- Maintain proper indentation (2 spaces in this code base).

### Use Semantic and Descriptive Naming

- Variables, functions, classes, and methods should have meaningful names that clearly describe their purpose.

### Separate Concerns Clearly

- Adhere to the Single Responsibility Principle (SRP).
- Organize logic clearly: keep controllers/routes minimal, move business logic to separate classes, modules, or services.

### Consistent Styling

- Utilize linting and formatting tools (Prettier, ESLint, etc.) to enforce style consistency.
- Leverage component-based design for CSS when applicable.

### Efficient Dependency Management

- Manage dependencies carefully, preferring minimal and actively maintained libraries.
- Use appropriate dependency management tools (npm, etc.).

### Testing and Quality Assurance

- When writing tests:
  - Write meaningful, effective unit tests (Jest).
  - Ensure tests verify actual functionality, edge cases, and error handling.
  - Regularly run tests as part of CI/CD pipelines.

### Performance and Optimization

- Be mindful of performance implications and optimize when necessary.
- Efficiently handle resource-intensive tasks with background processing (ES5 Promises for functional code, async for tests).

### Security Practices

- Follow best practices for secure coding (OWASP guidelines).
- Protect sensitive data using environment variables or secure vaults.
- Regularly update dependencies to patch vulnerabilities.

### Documentation and Comments

- Write clear, concise JSDocs for new functionality.
- Include comments only when necessary to explain non-obvious or complicated logic.
