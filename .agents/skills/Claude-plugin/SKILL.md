```markdown
# Claude-plugin Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill provides guidance for contributing to the Claude-plugin JavaScript codebase. It covers established coding conventions, file organization, and the specialized workflow for merging parallel plugin scaffolds—a rare but critical process in this repository. The patterns here help maintain consistency, resolve codebase divergence, and ensure high-quality plugin development.

## Coding Conventions

- **File Naming:**  
  Use `camelCase` for file names.  
  _Example:_  
  ```
  validatePlugin.js
  newComponent.md
  ```

- **Import Style:**  
  Use **relative imports** for modules within the codebase.  
  _Example:_  
  ```js
  import { validate } from './validatePlugin.js';
  ```

- **Export Style:**  
  Use **named exports**.  
  _Example:_  
  ```js
  // validatePlugin.js
  export function validate(plugin) { ... }
  ```

- **Commit Messages:**  
  Freeform, typically short (average 39 characters), with optional prefixes.

## Workflows

### Merge Parallel Plugin Scaffolds
**Trigger:** When two plugin scaffolds or branches need to be combined due to lack of common git history or parallel development.  
**Command:** `/merge-scaffolds`

1. **Identify overlapping files**  
   Compare both scaffolds for files with the same purpose (e.g., `agent definitions`, `README.md`, `plugin.json`, `hooks`).

2. **Resolve overlaps**  
   For each overlapping file:
   - Choose the more complete or up-to-date version.
   - If both have unique content, merge them manually.

   _Example: Merging plugin.json_
   ```json
   // Scaffold A plugin.json
   {
     "name": "pluginA",
     "features": ["feature1"]
   }
   // Scaffold B plugin.json
   {
     "name": "pluginB",
     "features": ["feature2"]
   }
   // Merged plugin.json
   {
     "name": "pluginA-pluginB",
     "features": ["feature1", "feature2"]
   }
   ```

3. **Update documentation**  
   - Revise `README.md` and `.claude-plugin/PLUGIN_SCHEMA_NOTES.md` to reflect the merged features and conventions.

4. **Update configuration files**  
   - Merge entries in `plugin.json`, `hooks.json`, `.gitignore`, etc., to include all relevant settings from both scaffolds.

5. **Adjust validation scripts**  
   - If validation rules in `scripts/ci/validate-plugin.js` are too strict for the merged conventions, relax or update them.

6. **Update or add tests**  
   - Ensure that new or merged functionality is covered by tests and that all tests pass.

7. **Commit all changes together**  
   - Make a single commit encompassing all the above changes.

## Testing Patterns

- **Test File Naming:**  
  Test files follow the `*.test.*` pattern (e.g., `validatePlugin.test.js`).

- **Framework:**  
  The specific testing framework is unknown, but tests are colocated with source files or in dedicated test files.

- **Example Test File:**  
  ```js
  // validatePlugin.test.js
  import { validate } from './validatePlugin.js';

  test('valid plugin passes validation', () => {
    expect(validate({ name: 'test' })).toBe(true);
  });
  ```

## Commands

| Command           | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| /merge-scaffolds  | Merge two parallel plugin scaffolds or branches into one codebase |
```
