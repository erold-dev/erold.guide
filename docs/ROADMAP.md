# GuideBase - Development Roadmap

> The free, open encyclopedia of development guidelines.
> Static site (Astro) + JSON API (S3/Blob) architecture.

---

## Architecture Overview

```
                            CONTENT AUTHORS
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   Markdown + Frontmatter    │
                    │   /content/guidelines/      │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │       BUILD PROCESS         │
                    │   (Astro + Custom Scripts)  │
                    └─────────────┬───────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  Static Site    │ │  JSON Files     │ │  Search Index   │
    │  (HTML/CSS/JS)  │ │  (Guidelines)   │ │  (Pagefind/     │
    │                 │ │                 │ │   Algolia)      │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
             ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │   Cloudflare    │ │   S3 / Azure    │ │   Search        │
    │   Pages / CDN   │ │   Blob Storage  │ │   Service       │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
             ▼                   ▼                   ▼
    ┌─────────────────────────────────────────────────────────┐
    │                      CONSUMERS                           │
    ├─────────────────┬───────────────────┬───────────────────┤
    │   Web Browsers  │   AI Agents       │   CLI Tools       │
    │   (Humans)      │   (erold-cli)     │   (IDE plugins)   │
    └─────────────────┴───────────────────┴───────────────────┘
```

---

## Why This Architecture?

| Aspect | Benefit |
|--------|---------|
| **Static Site** | Blazing fast, globally distributed via CDN, zero server costs |
| **S3/Blob JSON** | Instant API without backend servers, infinitely scalable |
| **Markdown Source** | Easy to contribute, version controlled in Git |
| **Build-time Generation** | Single source of truth, consistency guaranteed |
| **Pagefind/Algolia** | Fast client-side search, no server needed |

### Cost Estimate (At Scale)

| Component | 1M views/month | 10M views/month |
|-----------|----------------|-----------------|
| Cloudflare Pages | Free | Free |
| S3 Storage (10GB) | ~$0.23 | ~$0.23 |
| S3 Requests | ~$4 | ~$40 |
| Algolia (optional) | Free tier | ~$50 |
| **Total** | **~$5/month** | **~$90/month** |

---

## Technology Stack

### Core

| Component | Technology | Why |
|-----------|------------|-----|
| **Static Site Generator** | Astro 5.x | Fast, content-focused, MDX support |
| **Content Format** | Markdown + YAML frontmatter | Simple, portable, Git-friendly |
| **Styling** | Tailwind CSS | Utility-first, fast to build |
| **Search** | Pagefind | Static search, no server needed |
| **Hosting (Site)** | Cloudflare Pages | Free, fast, global CDN |
| **Hosting (API)** | Azure Blob / AWS S3 | Cheap, scalable, direct JSON access |

### Build & Deploy

| Component | Technology |
|-----------|------------|
| **Build** | GitHub Actions |
| **Content Validation** | Zod schemas |
| **JSON Generation** | Custom Astro integration |
| **Deploy Static** | Cloudflare Pages (auto) |
| **Deploy JSON** | Azure CLI / AWS CLI |

### Optional Enhancements

| Component | Technology | When |
|-----------|------------|------|
| **Full-text Search** | Algolia | When Pagefind isn't enough |
| **Auth (Contributors)** | GitHub OAuth | Phase 2 |
| **CMS (Non-technical)** | Decap CMS (formerly Netlify CMS) | Phase 3 |
| **Analytics** | Plausible / Umami | Launch |

---

## Project Structure

```
guidelines/
├── README.md
├── ROADMAP.md                    # This file
├── CONTRIBUTING.md               # How to contribute
│
├── astro.config.mjs              # Astro configuration
├── package.json
├── tsconfig.json
├── tailwind.config.mjs
│
├── content/                      # ALL CONTENT LIVES HERE
│   ├── technologies/             # Technology definitions
│   │   ├── typescript.yaml
│   │   ├── python.yaml
│   │   └── rust.yaml
│   │
│   ├── frameworks/               # Framework definitions
│   │   ├── nextjs.yaml
│   │   ├── react.yaml
│   │   ├── fastapi.yaml
│   │   └── tokio.yaml
│   │
│   ├── guidelines/               # THE GUIDELINES (main content)
│   │   ├── nextjs/
│   │   │   ├── app-router/
│   │   │   │   ├── server-components.md
│   │   │   │   ├── server-actions-validation.md
│   │   │   │   └── data-fetching.md
│   │   │   ├── security/
│   │   │   │   ├── authentication.md
│   │   │   │   └── csrf-protection.md
│   │   │   └── performance/
│   │   │       ├── image-optimization.md
│   │   │       └── bundle-size.md
│   │   │
│   │   ├── react/
│   │   │   └── ...
│   │   │
│   │   ├── fastapi/
│   │   │   └── ...
│   │   │
│   │   └── rust/
│   │       └── ...
│   │
│   └── authors/                  # Contributor profiles
│       ├── leerob.yaml
│       └── contributors.yaml
│
├── src/
│   ├── components/               # Astro/React components
│   │   ├── GuidelineCard.astro
│   │   ├── CodeBlock.astro
│   │   ├── Search.astro
│   │   ├── TableOfContents.astro
│   │   ├── VersionBadge.astro
│   │   └── ContributorBadge.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── GuidelineLayout.astro
│   │   └── FrameworkLayout.astro
│   │
│   ├── pages/
│   │   ├── index.astro           # Homepage
│   │   ├── search.astro          # Search page
│   │   ├── contribute.astro      # How to contribute
│   │   ├── about.astro           # About page
│   │   │
│   │   ├── [technology]/
│   │   │   ├── index.astro       # Technology page
│   │   │   └── [framework]/
│   │   │       ├── index.astro   # Framework page
│   │   │       └── [...slug].astro  # Guideline pages
│   │   │
│   │   └── api/                  # API documentation
│   │       └── index.astro
│   │
│   ├── styles/
│   │   └── global.css
│   │
│   └── utils/
│       ├── content.ts            # Content loading utilities
│       ├── search.ts             # Search utilities
│       └── api-generator.ts      # JSON API generation
│
├── scripts/
│   ├── build-api.ts              # Generate JSON files for S3
│   ├── validate-content.ts       # Validate all content
│   ├── sync-versions.ts          # Sync framework versions from npm/crates
│   └── deploy-api.ts             # Upload JSON to S3/Blob
│
├── schemas/                      # Zod schemas for validation
│   ├── guideline.ts
│   ├── framework.ts
│   ├── technology.ts
│   └── author.ts
│
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   └── robots.txt
│
└── dist/                         # Build output (gitignored)
    ├── site/                     # Static site files
    └── api/                      # JSON files for S3
        ├── v1/
        │   ├── guidelines/
        │   │   ├── index.json
        │   │   ├── nextjs/
        │   │   │   ├── index.json
        │   │   │   └── server-actions-validation.json
        │   │   └── ...
        │   ├── frameworks/
        │   │   ├── index.json
        │   │   └── nextjs.json
        │   ├── technologies/
        │   │   ├── index.json
        │   │   └── typescript.json
        │   └── search/
        │       └── index.json    # Search index for clients
        └── latest -> v1/         # Symlink to latest version
```

---

## Content Schema

### Guideline (Markdown + Frontmatter)

```markdown
---
# Metadata
id: nextjs-server-actions-validation
title: Server Actions Input Validation
slug: server-actions-validation

# Taxonomy
technology: typescript
framework: nextjs
topic: security
category: patterns

# Versioning
applies_to: ">=14.0.0"
verified_version: "15.1.0"
last_verified: 2025-12-15

# Quality
confidence: official        # official | verified | community | experimental
difficulty: intermediate    # beginner | intermediate | advanced
status: current            # current | deprecated | draft

# Author & Contributors
author: leerob
contributors:
  - timneutkens
  - feedthejim

# Related
tags:
  - security
  - validation
  - forms
  - zod
prerequisites:
  - nextjs-server-actions-basics
related:
  - nextjs-auth-patterns
  - nextjs-csrf-protection
superseded_by: null         # If deprecated, link to replacement

# Sources
sources:
  - title: Next.js Docs
    url: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
  - title: OWASP Input Validation
    url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

# Timestamps (auto-managed by git)
created_at: 2024-06-15
updated_at: 2025-12-15
---

Brief one-paragraph summary that appears in search results and cards.
This should be 1-2 sentences explaining what this guideline covers.

## Why This Matters

Explain why developers should care about this guideline.
What problems does it solve? What risks does it prevent?

## The Pattern

Explain the recommended approach.

```typescript
// Example code with full context
'use server'

import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
})

export async function createUser(formData: FormData) {
  const result = CreateUserSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
  })

  if (!result.success) {
    return { error: result.error.flatten() }
  }

  // Safe to use result.data
  await db.user.create({ data: result.data })
}
```

## Anti-Pattern

Show what NOT to do.

```typescript
// ❌ NEVER do this - trusting client data directly
export async function createUser(formData: FormData) {
  const email = formData.get('email') as string  // Dangerous!
  await db.user.create({ data: { email } })      // SQL injection risk
}
```

**Why this is bad:** Explain the specific vulnerabilities.

## Key Points

- Always validate with Zod or similar schema library
- Never trust `formData.get()` return values directly
- Return structured errors for client-side handling
- Consider rate limiting for public forms

## See Also

Links to related guidelines are auto-generated from `related` frontmatter.
```

### Framework Definition (YAML)

```yaml
# content/frameworks/nextjs.yaml
id: nextjs
name: Next.js
slug: nextjs
technology: typescript

# Metadata
description: The React Framework for Production
logo: /logos/nextjs.svg
website: https://nextjs.org
docs: https://nextjs.org/docs
repository: https://github.com/vercel/next.js

# Package info (for version syncing)
package:
  registry: npm
  name: next

# Current version (auto-updated by sync script)
current_version: "15.1.0"
version_updated: 2025-12-15

# Topics within this framework
topics:
  - id: app-router
    name: App Router
    description: The new App Router with React Server Components
    order: 1
  - id: pages-router
    name: Pages Router
    description: The traditional Pages Router
    order: 2
  - id: data-fetching
    name: Data Fetching
    description: Server-side and client-side data fetching patterns
    order: 3
  - id: security
    name: Security
    description: Authentication, authorization, and security best practices
    order: 4
  - id: performance
    name: Performance
    description: Optimization techniques and best practices
    order: 5
  - id: deployment
    name: Deployment
    description: Deploying Next.js applications
    order: 6

# Maintainers (for "Official" badge eligibility)
maintainers:
  - leerob
  - timneutkens
```

### Technology Definition (YAML)

```yaml
# content/technologies/typescript.yaml
id: typescript
name: TypeScript
slug: typescript

description: TypeScript is JavaScript with syntax for types
logo: /logos/typescript.svg
website: https://www.typescriptlang.org
docs: https://www.typescriptlang.org/docs

# Frameworks under this technology
frameworks:
  - nextjs
  - react
  - angular
  - vue
  - express
  - nestjs

# Categories that apply to all frameworks
global_categories:
  - security
  - performance
  - testing
  - architecture
  - patterns
  - anti-patterns
  - migration
  - setup
```

---

## API Output Structure

### JSON Files Generated for S3/Blob

```
dist/api/v1/
├── index.json                    # API root with links
│
├── technologies/
│   ├── index.json                # List all technologies
│   └── typescript.json           # Single technology
│
├── frameworks/
│   ├── index.json                # List all frameworks
│   ├── nextjs.json               # Framework with topics
│   └── nextjs/
│       ├── index.json            # All guidelines for Next.js
│       └── guidelines/
│           ├── server-actions-validation.json
│           └── ...
│
├── guidelines/
│   ├── index.json                # All guidelines (paginated)
│   ├── by-tag/
│   │   ├── security.json
│   │   └── performance.json
│   └── recent.json               # Recently updated
│
├── search/
│   ├── index.json                # Full search index (for clients)
│   └── suggestions.json          # Autocomplete data
│
└── meta/
    ├── stats.json                # Total counts, last updated
    ├── tags.json                 # All available tags
    ├── categories.json           # All categories
    └── versions.json             # Framework versions
```

### Example: Guideline JSON

```json
// dist/api/v1/frameworks/nextjs/guidelines/server-actions-validation.json
{
  "id": "nextjs-server-actions-validation",
  "title": "Server Actions Input Validation",
  "slug": "server-actions-validation",

  "summary": "Always validate and sanitize inputs in Server Actions using Zod or similar schema validation. Never trust client data.",

  "taxonomy": {
    "technology": {
      "id": "typescript",
      "name": "TypeScript"
    },
    "framework": {
      "id": "nextjs",
      "name": "Next.js"
    },
    "topic": {
      "id": "security",
      "name": "Security"
    },
    "category": "patterns"
  },

  "version": {
    "applies_to": ">=14.0.0",
    "verified_version": "15.1.0",
    "last_verified": "2025-12-15"
  },

  "quality": {
    "confidence": "official",
    "difficulty": "intermediate",
    "status": "current"
  },

  "content": {
    "markdown": "## Why This Matters\n\n...",
    "html": "<h2>Why This Matters</h2>...",
    "sections": [
      {
        "id": "why-this-matters",
        "title": "Why This Matters",
        "content": "..."
      },
      {
        "id": "the-pattern",
        "title": "The Pattern",
        "content": "...",
        "code_blocks": [
          {
            "language": "typescript",
            "code": "'use server'\n\nimport { z } from 'zod'...",
            "filename": "actions.ts"
          }
        ]
      },
      {
        "id": "anti-pattern",
        "title": "Anti-Pattern",
        "content": "...",
        "code_blocks": [
          {
            "language": "typescript",
            "code": "// ❌ NEVER do this...",
            "is_anti_pattern": true
          }
        ]
      }
    ]
  },

  "code_examples": [
    {
      "title": "Zod Validation",
      "language": "typescript",
      "code": "'use server'\n\nimport { z } from 'zod'...",
      "is_anti_pattern": false
    },
    {
      "title": "Trusting Client Data",
      "language": "typescript",
      "code": "// ❌ NEVER do this...",
      "is_anti_pattern": true,
      "why_bad": "Directly using client data without validation..."
    }
  ],

  "author": {
    "id": "leerob",
    "name": "Lee Robinson",
    "avatar": "https://github.com/leerob.png",
    "verified": true,
    "role": "maintainer"
  },

  "contributors": [
    {"id": "timneutkens", "name": "Tim Neutkens"},
    {"id": "feedthejim", "name": "Jimmy Lai"}
  ],

  "tags": ["security", "validation", "forms", "zod"],

  "related": [
    {
      "id": "nextjs-auth-patterns",
      "title": "Authentication Patterns",
      "slug": "auth-patterns"
    }
  ],

  "sources": [
    {
      "title": "Next.js Docs",
      "url": "https://nextjs.org/docs/..."
    }
  ],

  "urls": {
    "web": "https://guidebase.dev/typescript/nextjs/security/server-actions-validation",
    "api": "https://api.guidebase.dev/v1/frameworks/nextjs/guidelines/server-actions-validation.json",
    "raw": "https://raw.guidebase.dev/guidelines/nextjs/security/server-actions-validation.md"
  },

  "meta": {
    "created_at": "2024-06-15T00:00:00Z",
    "updated_at": "2025-12-15T14:22:00Z",
    "word_count": 847,
    "reading_time_minutes": 4
  }
}
```

### Example: Search Index

```json
// dist/api/v1/search/index.json
{
  "version": "1.0",
  "generated_at": "2025-12-15T20:00:00Z",
  "total_guidelines": 1247,

  "entries": [
    {
      "id": "nextjs-server-actions-validation",
      "title": "Server Actions Input Validation",
      "summary": "Always validate and sanitize inputs...",
      "framework": "nextjs",
      "technology": "typescript",
      "topic": "security",
      "tags": ["security", "validation", "zod"],
      "confidence": "official",
      "url": "/typescript/nextjs/security/server-actions-validation"
    }
    // ... all other guidelines
  ],

  "facets": {
    "technologies": [
      {"id": "typescript", "name": "TypeScript", "count": 523},
      {"id": "python", "name": "Python", "count": 312}
    ],
    "frameworks": [
      {"id": "nextjs", "name": "Next.js", "count": 187},
      {"id": "react", "name": "React", "count": 145}
    ],
    "categories": [
      {"id": "security", "name": "Security", "count": 234},
      {"id": "performance", "name": "Performance", "count": 198}
    ]
  }
}
```

---

## API Endpoints (S3/Blob URLs)

Since files are static JSON in S3/Blob, the "API" is just file paths:

```
Base URL: https://api.guidebase.dev/v1

# List all
GET /technologies/index.json
GET /frameworks/index.json
GET /guidelines/index.json

# Get single
GET /technologies/typescript.json
GET /frameworks/nextjs.json
GET /frameworks/nextjs/guidelines/server-actions-validation.json

# Filtered
GET /guidelines/by-tag/security.json
GET /guidelines/by-framework/nextjs.json
GET /guidelines/recent.json

# Search (client downloads full index)
GET /search/index.json

# Metadata
GET /meta/stats.json
GET /meta/versions.json
```

### For AI Agents (Convenience Wrapper)

Optional: A tiny Cloudflare Worker for query parsing:

```
# Natural language search
GET https://api.guidebase.dev/search?q=nextjs+auth+validation

# Stack-based
GET https://api.guidebase.dev/stack?technologies=nextjs,typescript

# Returns same JSON, just routes to correct static file
```

---

## Build Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/build-deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily: sync framework versions

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - name: Validate Content
        run: npm run validate

      - name: Check Links
        run: npm run check-links

  build:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - name: Sync Framework Versions
        run: npm run sync-versions

      - name: Build Static Site
        run: npm run build

      - name: Generate API JSON
        run: npm run build-api

      - name: Upload Site Artifact
        uses: actions/upload-artifact@v4
        with:
          name: site
          path: dist/site

      - name: Upload API Artifact
        uses: actions/upload-artifact@v4
        with:
          name: api
          path: dist/api

  deploy-site:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Download Site Artifact
        uses: actions/download-artifact@v4
        with:
          name: site
          path: dist/site

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: guidebase
          directory: dist/site

  deploy-api:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Download API Artifact
        uses: actions/download-artifact@v4
        with:
          name: api
          path: dist/api

      - name: Deploy to Azure Blob
        uses: azure/CLI@v2
        with:
          inlineScript: |
            az storage blob upload-batch \
              --account-name guidebaseapi \
              --destination '$web' \
              --source dist/api \
              --overwrite \
              --content-type "application/json" \
              --content-cache-control "public, max-age=300"
```

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Basic static site with sample content

- [ ] Initialize Astro project with Tailwind
- [ ] Create base layouts and components
- [ ] Define content schemas (Zod)
- [ ] Create folder structure for content
- [ ] Build homepage
- [ ] Build framework listing page
- [ ] Build guideline detail page
- [ ] Add 10-20 sample guidelines (from your ~/.claude/rules/)
- [ ] Set up Pagefind for search
- [ ] Deploy to Cloudflare Pages

**Deliverable:** Live site with sample content, browsable

### Phase 2: API Layer (Weeks 3-4)

**Goal:** JSON API files generated and deployed

- [ ] Create build-api script
- [ ] Generate JSON for all content
- [ ] Set up Azure Blob / S3 storage
- [ ] Configure CDN (Azure CDN / CloudFront)
- [ ] Deploy API files
- [ ] Create API documentation page
- [ ] Add CORS headers for API
- [ ] Test with curl/Postman

**Deliverable:** Working JSON API at api.guidebase.dev

### Phase 3: erold-cli Integration (Weeks 5-6)

**Goal:** erold-cli uses GuideBase instead of web scraping

- [ ] Create `erold-guidelines` crate
- [ ] Implement GuideBase client
- [ ] Add local caching with TTL
- [ ] Detect project stack (package.json, Cargo.toml, etc.)
- [ ] Fetch relevant guidelines
- [ ] Inject into LLM context
- [ ] Remove old `erold-web` scraping code

**Deliverable:** erold-cli powered by GuideBase

### Phase 4: Content Expansion (Weeks 7-10)

**Goal:** Real content at scale

- [ ] Import awesome-* lists (with attribution)
- [ ] Convert official docs best practices
- [ ] Reach out to framework maintainers
- [ ] Add contributor guidelines
- [ ] Create content templates
- [ ] Target: 500+ guidelines across 20+ frameworks

**Deliverable:** Substantial content library

### Phase 5: Community Features (Weeks 11-14)

**Goal:** Allow contributions

- [ ] GitHub OAuth integration
- [ ] "Edit on GitHub" links
- [ ] Contribution workflow (PR-based)
- [ ] Contributor profiles
- [ ] Basic moderation (PR review)
- [ ] Version history (git log)
- [ ] "Last verified" badges

**Deliverable:** Community can contribute

### Phase 6: Polish & Launch (Weeks 15-16)

**Goal:** Production-ready launch

- [ ] SEO optimization
- [ ] Open Graph images
- [ ] Analytics (Plausible)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Mobile responsiveness
- [ ] Launch blog post
- [ ] Product Hunt launch

**Deliverable:** Public launch!

---

## Future Enhancements (Post-Launch)

### Phase 7: Advanced Search
- [ ] Algolia integration for better search
- [ ] AI-powered search (embeddings)
- [ ] "Ask a question" feature

### Phase 8: Verification System
- [ ] GitHub-based contributor verification
- [ ] Framework maintainer badges
- [ ] Expert verification program

### Phase 9: CMS for Non-Technical Contributors
- [ ] Decap CMS integration
- [ ] Visual editor
- [ ] Preview deployments

### Phase 10: Ecosystem Expansion
- [ ] VS Code extension
- [ ] MCP server for Claude
- [ ] OpenAI plugin
- [ ] GitHub bot (suggest guidelines in PRs)

---

## Local Development

```bash
# Clone and install
git clone https://github.com/guidebase/guidebase.git
cd guidebase
npm install

# Start dev server
npm run dev
# → http://localhost:4321

# Validate content
npm run validate

# Build everything
npm run build

# Preview production build
npm run preview

# Generate API JSON only
npm run build-api

# Sync framework versions from npm/crates
npm run sync-versions
```

---

## Contributing Guidelines

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- How to add a new guideline
- Content style guide
- Code example standards
- Review process
- Verification levels

---

## License

- **Content:** CC-BY-SA 4.0 (like Wikipedia)
- **Code Examples:** MIT
- **Site Code:** MIT

---

## Contact

- GitHub: https://github.com/guidebase/guidebase
- Discord: https://discord.gg/guidebase
- Twitter: @guidebasedev

---

*Last updated: December 2025*
