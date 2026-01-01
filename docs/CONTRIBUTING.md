# Contributing to GuideBase

Thank you for helping build the free encyclopedia of development guidelines!

---

## Ways to Contribute

### 1. Add a New Guideline

1. Fork the repository
2. Create a new markdown file in the appropriate folder:
   ```
   content/guidelines/{framework}/{topic}/{guideline-slug}.md
   ```
3. Use the template below
4. Submit a Pull Request

### 2. Improve Existing Guidelines

- Fix typos or outdated information
- Add code examples
- Improve explanations
- Update for new framework versions

### 3. Verify Guidelines

- Test code examples
- Confirm accuracy against official docs
- Add "verified for version X" confirmation

### 4. Report Issues

- Outdated information
- Incorrect code examples
- Missing guidelines for common problems

---

## Guideline Template

```markdown
---
id: {framework}-{topic}-{short-name}
title: Your Guideline Title
slug: {short-name}

technology: typescript  # or python, rust, go, etc.
framework: nextjs       # must exist in content/frameworks/
topic: security         # must be valid topic for this framework
category: patterns      # patterns | anti-patterns | setup | migration | troubleshooting

applies_to: ">=14.0.0"  # semver range
verified_version: "15.1.0"
last_verified: 2025-12-15

confidence: community   # official | verified | community | experimental
difficulty: intermediate  # beginner | intermediate | advanced
status: current         # current | deprecated | draft

author: your-github-username
contributors: []

tags:
  - relevant
  - tags
  - here

prerequisites: []       # IDs of guidelines to read first
related: []            # IDs of related guidelines

sources:
  - title: Source Name
    url: https://example.com
---

One or two sentences summarizing what this guideline covers. This appears in search results and preview cards.

## Why This Matters

Explain the problem this guideline solves. Why should developers care?

## The Pattern

Explain the recommended approach in detail.

```typescript
// Full, working code example
// Include imports and context
```

## Anti-Pattern (Optional)

Show what NOT to do and explain why.

```typescript
// ❌ Don't do this
// Explain why this is problematic
```

## Key Points

- Bullet point summary
- Of the main takeaways
- Easy to scan

## See Also

Related guidelines are auto-linked from the `related` frontmatter.
```

---

## Content Standards

### Writing Style

- **Be concise** - Developers are busy
- **Be practical** - Show real code, not theory
- **Be specific** - "Use Zod" not "Use a validation library"
- **Be current** - Specify version numbers

### Code Examples

- **Must compile/run** - Test your code
- **Include imports** - Show complete context
- **Use modern syntax** - Latest stable features
- **Add comments** - Explain non-obvious parts

```typescript
// ✅ Good: Complete, runnable example
'use server'

import { z } from 'zod'
import { db } from '@/lib/db'

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

export async function createUser(formData: FormData) {
  const result = UserSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
  })

  if (!result.success) {
    return { error: result.error.flatten() }
  }

  return db.user.create({ data: result.data })
}
```

```typescript
// ❌ Bad: Incomplete, won't run
const schema = z.object({...})
// validate here
```

### Version Ranges

Use semver ranges in `applies_to`:

| Range | Meaning |
|-------|---------|
| `>=14.0.0` | Version 14.0.0 and above |
| `>=14.0.0 <16.0.0` | Version 14.x and 15.x only |
| `^15.0.0` | Any 15.x version |
| `15.1.0` | Exactly this version |

---

## Verification Levels

### Community (Default)
- Submitted by any contributor
- Reviewed by maintainers
- Not verified against official sources

### Verified
- Code examples tested
- Cross-referenced with official docs
- Reviewed by domain expert

### Official
- Written or approved by framework maintainers
- Matches official documentation
- Framework team can update

---

## Pull Request Process

1. **Validate locally**
   ```bash
   npm run validate
   ```

2. **Check your content**
   - Frontmatter is complete
   - Code examples are correct
   - Links work
   - Spelling is correct

3. **Submit PR**
   - Clear title: `Add: Next.js Server Actions validation guide`
   - Description explains the guideline
   - Link to sources if applicable

4. **Review**
   - Maintainers review within 48 hours
   - Address feedback
   - Merge!

---

## Folder Structure

```
content/guidelines/
├── nextjs/
│   ├── app-router/
│   │   ├── server-components.md
│   │   └── data-fetching.md
│   ├── security/
│   │   └── server-actions-validation.md
│   └── performance/
│       └── image-optimization.md
├── react/
│   └── ...
└── fastapi/
    └── ...
```

**Rules:**
- Framework folder must exist in `content/frameworks/`
- Topic folder must be defined in framework's `topics` list
- Slug must be URL-safe (lowercase, hyphens)

---

## Questions?

- Open a GitHub Discussion
- Join our Discord
- Tag @guidebasedev on Twitter

Thank you for contributing! Every guideline helps developers worldwide.
