---
title: How to Write Guidelines
slug: how-to-write-guidelines
framework: erold
category: contributing
version: "1.0.0"
description: Learn the structure, format, and best practices for writing guidelines that help developers and AI agents build better software.
tags:
  - contributing
  - documentation
  - style-guide
  - meta
deprecated: false
author: erold-team
contributors: []
createdAt: "2026-01-01T00:00:00Z"
updatedAt: "2026-01-01T00:00:00Z"
relatedGuidelines: []
prerequisites: []
difficulty: beginner
estimatedReadTime: 10

ai:
  prompt_snippet: "When writing a guideline for erold.guide, follow this structure: YAML frontmatter with required fields (title, slug, framework, category, version, description, tags, author, difficulty), then markdown content with sections for Why, When to Apply, Code Examples, Anti-patterns, and Summary."
  applies_when:
    - "Contributing a new guideline to erold.guide"
    - "Updating an existing guideline"
    - "Reviewing guideline submissions"
  does_not_apply_when:
    - "Reading guidelines as a consumer"
    - "Using the API to fetch guidelines"
  priority: critical
  confidence: established

changelog:
  - version: "1.0.0"
    date: "2026-01-01"
    changes:
      - "Initial guideline release"
---

# How to Write Guidelines

This guide explains how to write effective guidelines for erold.guide. Whether you're contributing a new guideline or improving an existing one, follow these standards to ensure consistency and quality.

## Guideline Structure

Every guideline consists of two parts:

1. **YAML Frontmatter** - Metadata about the guideline
2. **Markdown Content** - The actual guideline content

## YAML Frontmatter

The frontmatter contains all metadata and must be valid YAML between `---` delimiters.

### Required Fields

```yaml
---
title: "Clear, Actionable Title"          # 5-100 characters
slug: "url-friendly-slug"                  # lowercase, hyphens only
framework: "nextjs"                        # Framework ID (e.g., nextjs, fastapi, react)
category: "app-router"                     # Category within framework
version: "1.0.0"                           # Semantic version of this guideline
description: "A concise description..."    # 20-300 characters
tags:                                      # 1-10 relevant tags
  - performance
  - best-practices
author: "github-username"                  # Your GitHub username
difficulty: beginner                       # beginner | intermediate | advanced
estimatedReadTime: 5                       # Minutes (1-60)
createdAt: "2026-01-01T00:00:00Z"         # ISO 8601 datetime
updatedAt: "2026-01-01T00:00:00Z"         # ISO 8601 datetime
deprecated: false                          # boolean
contributors: []                           # Array of GitHub usernames
relatedGuidelines: []                      # Array of related slugs
prerequisites: []                          # Array of prerequisite slugs
---
```

### Optional Fields

```yaml
# Version constraints (when guideline applies)
minVersion: "13.0.0"                       # Minimum framework version
maxVersion: "15.9.9"                       # Maximum framework version

# Deprecation notice
deprecated: true
deprecatedMessage: "Use server-actions-validation instead"

# AI-optimized fields (highly recommended)
ai:
  prompt_snippet: "Brief instruction for AI..."  # Max 500 chars
  applies_when:                            # When to use this guideline
    - "Creating a new component"
    - "Optimizing performance"
  does_not_apply_when:                     # When NOT to use
    - "Using legacy Pages Router"
  priority: critical                       # critical | recommended | optional
  confidence: established                  # established | emerging | experimental

# Version history
changelog:
  - version: "1.0.0"
    date: "2026-01-01"
    changes:
      - "Initial release"
```

## Markdown Content

The content should be clear, actionable, and include practical examples.

### Recommended Structure

```markdown
# Title (Same as frontmatter title)

Brief introduction explaining what this guideline covers and why it matters.

## Why This Matters

Explain the reasoning behind this guideline:
- Performance implications
- Security considerations
- Maintainability benefits
- Common problems it prevents

## When to Apply

Describe the scenarios where this guideline applies:
- Specific use cases
- Project types
- Development stages

## Code Examples

### Good Example

\`\`\`typescript
// Annotate what makes this good
const goodExample = () => {
  // Implementation
};
\`\`\`

### Bad Example (Anti-pattern)

\`\`\`typescript
// BAD: Explain why this is problematic
const badExample = () => {
  // Problematic implementation
};
\`\`\`

## Common Mistakes

List common mistakes developers make:

1. **Mistake One** - Why it's wrong and how to fix it
2. **Mistake Two** - Why it's wrong and how to fix it

## Summary

| Scenario | Recommendation |
|----------|----------------|
| Case A   | Do X           |
| Case B   | Do Y           |

## Further Reading

- [Link to official docs](https://example.com)
- [Related guideline](./related-slug)
```

## Writing Style

### Be Direct and Actionable

```markdown
<!-- Good -->
Use Server Components by default. Only add 'use client' when needed.

<!-- Avoid -->
It is generally recommended that developers consider using Server Components
as their default choice in most situations where possible.
```

### Use Active Voice

```markdown
<!-- Good -->
Validate all user input before processing.

<!-- Avoid -->
User input should be validated before it is processed.
```

### Include the "Why"

Don't just state rules—explain the reasoning:

```markdown
<!-- Good -->
Never store sensitive data in localStorage. LocalStorage is accessible to any
JavaScript on the page, making it vulnerable to XSS attacks.

<!-- Avoid -->
Never store sensitive data in localStorage.
```

## Code Examples

### Language Annotation

Always specify the language for syntax highlighting:

````markdown
```typescript
// TypeScript code
```

```python
# Python code
```

```bash
# Shell commands
```
````

### Comment Your Examples

```typescript
// Good: Comments explain the important parts
export async function getProducts() {
  // Server Component - this runs on the server only
  const products = await db.query('SELECT * FROM products');

  // Data never exposed to client bundle
  return products;
}
```

### Show Both Good and Bad

Always show what to do AND what to avoid:

```typescript
// GOOD: Parameterized query prevents SQL injection
await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// BAD: String concatenation is vulnerable to SQL injection
await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

## AI-Optimized Fields

The `ai` section helps AI assistants apply your guideline correctly.

### prompt_snippet

A concise instruction that AI can use directly:

```yaml
ai:
  prompt_snippet: "In Next.js App Router, use Server Components by default. Only add 'use client' for components needing onClick, useState, useEffect, or browser APIs like localStorage."
```

### applies_when / does_not_apply_when

Clear conditions for when the guideline applies:

```yaml
ai:
  applies_when:
    - "Creating a new React component in Next.js 13+"
    - "Deciding between Server and Client Components"
    - "Optimizing bundle size"
  does_not_apply_when:
    - "Using Next.js Pages Router (pages/ directory)"
    - "Building a purely client-side SPA"
    - "Component requires useState or event handlers"
```

### priority and confidence

- **priority**: How important is following this guideline?
  - `critical` - Must follow, security/correctness implications
  - `recommended` - Should follow for best results
  - `optional` - Nice to have, situational

- **confidence**: How established is this practice?
  - `established` - Industry standard, widely accepted
  - `emerging` - Gaining adoption, recommended by framework authors
  - `experimental` - New practice, may change

## File Organization

Guidelines are organized by framework and category:

```
content/
└── guidelines/
    └── {framework}/
        └── {category}/
            └── {slug}.md
```

Example:
```
content/
└── guidelines/
    └── nextjs/
        └── app-router/
            └── server-components-default.md
```

## Validation

Before submitting, ensure your guideline:

1. **Passes schema validation** - All required fields present
2. **Has working code examples** - Code compiles/runs correctly
3. **Includes both good and bad examples** - Shows what to do and avoid
4. **Has AI fields** - prompt_snippet and applies_when are set
5. **Uses correct tags** - Relevant, existing tags when possible
6. **Links related guidelines** - Connect to prerequisite/related content

## Submission Checklist

- [ ] Title is clear and actionable (5-100 chars)
- [ ] Description summarizes the guideline (20-300 chars)
- [ ] Correct framework and category
- [ ] Appropriate difficulty level
- [ ] Realistic estimated read time
- [ ] At least one code example
- [ ] Anti-pattern example included
- [ ] AI prompt_snippet is concise and useful
- [ ] applies_when conditions are specific
- [ ] does_not_apply_when prevents misapplication
- [ ] Tags are relevant (1-10 tags)
- [ ] No spelling/grammar errors

## Summary

| Element | Requirement |
|---------|-------------|
| Frontmatter | All required fields, valid YAML |
| Title | Clear, actionable, 5-100 chars |
| Content | Why, When, Examples, Anti-patterns |
| Code | Annotated, both good and bad |
| AI fields | prompt_snippet + applies_when |
| Style | Direct, active voice, explains "why" |
