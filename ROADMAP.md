# erold.guide Contribution System Roadmap

## Overview

Build a contribution system where users can submit guidelines via API, get AI-reviewed, and admins approve for publication.

## Architecture

```
                    ┌─────────────── CloudFront ───────────────┐
                    │                                          │
        ┌───────────┴───────────┐              ┌───────────────┴───────────┐
        │                       │              │                           │
   erold.guide            api.erold.guide    contribute.erold.guide
   (Astro static)         (JSON static)      (API Gateway + Lambda)
        │                       │                       │
        └───────────┬───────────┘                       │
                    │                                   │
                    ▼                                   ▼
        ┌───────────────────┐              ┌────────────────────────┐
        │  S3: Official     │◄─── publish ─│  Lambda Functions      │
        │  (public read)    │              │  - auth (GitHub OAuth) │
        │  - guidelines     │              │  - submit              │
        │  - API JSON       │              │  - ai-review (Claude)  │
        └───────────────────┘              │  - admin API           │
                                           │  - publish             │
                                           └───────────┬────────────┘
                                                       │
                                    ┌──────────────────┼──────────────────┐
                                    ▼                  ▼                  ▼
                            ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
                            │  DynamoDB   │   │ S3: Pending  │   │ Anthropic    │
                            │  - users    │   │ - drafts     │   │ Claude API   │
                            │  - reviews  │   │ - versions   │   │              │
                            │  - status   │   └──────────────┘   └──────────────┘
                            └─────────────┘
```

## Contribution Flow

```
1. User clicks "Contribute" → GitHub OAuth → JWT token
2. Submit guideline → Validate schema
3. Store in S3 pending + DynamoDB record
4. AI Review (Claude):
   - Format/schema compliance
   - Duplicates with existing
   - Quality/completeness
   - Version conflicts
   → Pre-approve / Request changes
5. Admin Review UI → Approve/Reject
6. Publish:
   - Copy to official S3
   - Regenerate API JSON
   - Invalidate CloudFront cache
   → Live immediately
```

## AWS Services

| Service | Purpose | Est. Cost |
|---------|---------|-----------|
| API Gateway | REST API for contributions | ~$3.50/million requests |
| Lambda | Business logic | ~$0.20/million invocations |
| DynamoDB | Metadata, users, reviews | ~$1/month (on-demand) |
| S3 (pending) | Store drafts | ~$0.023/GB |
| Cognito | GitHub OAuth | Free tier |
| Anthropic API | AI review | ~$0.01-0.03/review |

---

## Phase 1: Meta-guideline + Contribution Pages (Static)

**Goal**: Create content explaining how to contribute

### Tasks
- [ ] Create meta-guideline: "How to Write Guidelines"
  - Structure and format requirements
  - YAML frontmatter schema
  - Markdown formatting rules
  - Code example standards
  - Tag and severity conventions
- [ ] Create `/contribute` page on website
  - Explain contribution process
  - Link to meta-guideline
  - Show what makes a good guideline
- [ ] Create `/contribute/api` page
  - API documentation for submissions
  - Schema reference
  - Example requests

---

## Phase 2: GitHub OAuth + Submission API

**Goal**: Users can authenticate and submit guidelines

### Tasks
- [ ] Set up GitHub OAuth App
- [ ] Create API Gateway + Lambda for auth
- [ ] Create submission endpoint
- [ ] Create S3 bucket for pending submissions
- [ ] Create DynamoDB table for metadata
- [ ] Add submission form to website
- [ ] Validate submissions against Zod schema

---

## Phase 3: AI Claude Reviewer

**Goal**: Automatic quality review of submissions

### Tasks
- [ ] Create Lambda for AI review
- [ ] Integrate Anthropic Claude API
- [ ] Define review criteria prompt
- [ ] Store review results in DynamoDB
- [ ] Auto pre-approve or flag for manual review
- [ ] Check for duplicates against existing content
- [ ] Version conflict detection

---

## Phase 4: Admin Review UI

**Goal**: Admin interface to approve/reject submissions

### Tasks
- [ ] Create admin routes (protected)
- [ ] List pending submissions
- [ ] Show AI review assessment
- [ ] Approve/reject actions
- [ ] Edit before publishing
- [ ] Contributor attribution display

---

## Phase 5: Auto-publish Pipeline

**Goal**: Approved guidelines go live automatically

### Tasks
- [ ] Lambda to copy approved content to official S3
- [ ] Regenerate API JSON files
- [ ] Invalidate CloudFront cache
- [ ] Update contributor credits
- [ ] Notification to contributor (approved/rejected)
- [ ] Version history tracking

---

## Future Enhancements

- [ ] Propose edits to existing guidelines (PR-style)
- [ ] Contributor leaderboard
- [ ] Guideline voting/feedback
- [ ] Automated testing of code examples
- [ ] Multi-language support
- [ ] RSS feed for new guidelines
