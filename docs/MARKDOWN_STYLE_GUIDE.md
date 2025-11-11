# Markdown Style Guide

## Overview

This project uses markdownlint to enforce consistent markdown formatting across all documentation. This guide explains the rules and best practices.

## Configuration

Markdown linting is configured in [`.markdownlint.json`](../.markdownlint.json) at the project root.

## Key Rules

### MD012: No Multiple Blank Lines

**Rule:** Maximum of 1 consecutive blank line.

**Why:** Improves readability and consistency.

**Bad:**

```markdown
# Heading


Some text
```

**Good:**

```markdown
# Heading

Some text
```

### MD031: Blank Lines Around Fenced Code Blocks

**Rule:** Fenced code blocks must be surrounded by blank lines.

**Why:** Improves readability and ensures proper rendering.

**Bad:**

```markdown
Some text
```bash
echo "hello"
```
More text
```

**Good:**

```markdown
Some text

```bash
echo "hello"
```

More text
```

### MD032: Blank Lines Around Lists

**Rule:** Lists must be surrounded by blank lines.

**Why:** Ensures proper rendering and improves readability.

**Bad:**

```markdown
Some text
- Item 1
- Item 2
More text
```

**Good:**

```markdown
Some text

- Item 1
- Item 2

More text
```

### MD034: No Bare URLs

**Rule:** URLs must be wrapped in angle brackets or markdown links.

**Why:** Ensures proper link rendering and clickability.

**Bad:**

```markdown
Visit https://example.com for details
```

**Good:**

```markdown
Visit <https://example.com> for details

Or:

Visit [our website](https://example.com) for details
```

### MD036: No Emphasis as Heading

**Rule:** Don't use bold or italic text as a substitute for headings.

**Why:** Proper semantic structure helps screen readers and maintains consistent styling.

**Bad:**

```markdown
**Important Section**

This is some content
```

**Good:**

```markdown
## Important Section

This is some content
```

### MD040: Fenced Code Language

**Rule:** All fenced code blocks must specify a language.

**Why:** Enables syntax highlighting and improves readability.

**Bad:**

```markdown
```
code here
```
```

**Good:**

```markdown
```bash
echo "hello"
```

```go
func main() {}
```

```text
Plain text or diagrams
```
```

### Common Language Identifiers

Use these language identifiers for code blocks:

- `bash` - Shell commands
- `text` - Plain text, ASCII diagrams, non-code content
- `yaml` - YAML configuration files
- `json` - JSON data
- `hcl` - Terraform configuration
- `go` - Go code
- `javascript` - JavaScript/React code
- `typescript` - TypeScript code
- `sql` - SQL queries
- `dockerfile` - Dockerfiles
- `markdown` - Markdown examples

### MD029: Ordered List Style

**Rule:** Use consistent ordered list prefixes (1. 2. 3. not 1. 1. 1.).

**Why:** Improves readability in source and rendered output.

**Bad:**

```markdown
1. First item
1. Second item
1. Third item
```

**Good:**

```markdown
1. First item
2. Second item
3. Third item
```

## Disabled Rules

### MD013: Line Length

**Disabled** - No line length limits enforced.

**Why:** Technical documentation often requires long lines for URLs, commands, and code examples.

### MD041: First Line Must Be Top-Level Heading

**Disabled** - Files don't need to start with `# Heading`.

**Why:** Some documents have metadata, badges, or other content before the main heading.

## Running the Linter

### In VS Code

Install the [markdownlint extension](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint).

Issues will be highlighted automatically in the editor.

### Command Line

Install markdownlint-cli:

```bash
npm install -g markdownlint-cli
```

Lint all markdown files:

```bash
markdownlint "**/*.md"
```

Lint and fix automatically:

```bash
markdownlint "**/*.md" --fix
```

Lint specific file:

```bash
markdownlint docs/README.md
```

## Best Practices

### 1. Always Add Blank Lines

When in doubt, add blank lines:

- Before and after headings
- Before and after code blocks
- Before and after lists
- Between major sections

### 2. Specify Code Block Languages

Always specify a language for code blocks. Use `text` if no specific language applies.

### 3. Use Proper Headings

Don't use bold text as headings. Use `##`, `###`, etc. for proper semantic structure.

### 4. Format URLs Properly

Wrap bare URLs in angle brackets: `<https://example.com>`

Or use markdown link syntax: `[link text](https://example.com)`

### 5. Consistent List Formatting

- Use `-` for unordered lists (not `*` or `+`)
- Use proper numbering for ordered lists (1. 2. 3.)
- Always surround lists with blank lines

## Automated Checking

Consider adding markdown linting to your CI/CD pipeline:

```yaml
- name: Lint markdown files
  run: markdownlint "**/*.md"
```

This ensures all markdown changes pass linting before merging.

## Questions?

If you encounter linting issues you don't understand, check:

1. This style guide
2. The [`.markdownlint.json`](../.markdownlint.json) configuration
3. [markdownlint documentation](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
