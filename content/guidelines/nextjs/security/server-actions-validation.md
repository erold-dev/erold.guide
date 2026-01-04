---
title: Always Validate Server Action Inputs
slug: server-actions-validation
topic: nextjs
category: security
version: "1.0.0"
description: Server Actions are public HTTP endpoints. Always validate and sanitize all inputs using Zod or similar validation libraries to prevent security vulnerabilities.
tags:
  - security
  - server-actions
  - validation
  - zod
  - owasp
minVersion: "14.0.0"
deprecated: false
author: erold-team
contributors: []
createdAt: "2025-01-01T00:00:00Z"
updatedAt: "2025-01-01T00:00:00Z"
related:
  - nextjs/security/input-sanitization
  - nextjs/security/sql-injection-prevention
collections: []
prerequisites:
  - nextjs/app-router/server-components-default
difficulty: intermediate
estimatedReadTime: 8
---

# Always Validate Server Action Inputs

Server Actions in Next.js are exposed as public HTTP POST endpoints. Anyone can call them directly, bypassing your UI. **Never trust incoming data**.

## The Security Risk

```tsx
// DANGEROUS: No validation!
"use server";

export async function updateUser(formData: FormData) {
  const email = formData.get('email');
  const role = formData.get('role');

  // Attacker can set role to 'admin' directly!
  await db.user.update({
    where: { email },
    data: { role }
  });
}
```

An attacker can call this endpoint with:
```bash
curl -X POST https://yoursite.com/api/updateUser \
  -d "email=attacker@evil.com&role=admin"
```

## Solution: Validate with Zod

Always validate inputs at the server action boundary:

```tsx
"use server";

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Define schema
const UpdateProfileSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  // Parse and validate
  const result = UpdateProfileSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
    bio: formData.get('bio'),
  });

  if (!result.success) {
    return { error: result.error.flatten() };
  }

  // Now data is validated and typed
  const { email, name, bio } = result.data;

  // Additional authorization check
  const session = await getSession();
  if (session.user.email !== email) {
    return { error: 'Unauthorized' };
  }

  await db.user.update({
    where: { email },
    data: { name, bio },
  });

  revalidatePath('/profile');
  return { success: true };
}
```

## Validation Checklist

### 1. Type Validation
```typescript
const schema = z.object({
  count: z.number().int().positive(),
  price: z.number().min(0),
  isActive: z.boolean(),
});
```

### 2. String Constraints
```typescript
const schema = z.object({
  username: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  url: z.string().url(),
});
```

### 3. Enum Validation
```typescript
// Don't trust string values!
const schema = z.object({
  role: z.enum(['user', 'editor']), // NOT 'admin'!
  status: z.enum(['draft', 'published']),
});
```

### 4. Array Limits
```typescript
const schema = z.object({
  tags: z.array(z.string()).max(10),
  items: z.array(ItemSchema).min(1).max(100),
});
```

## Complete Example with Error Handling

```tsx
"use server";

import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(5).max(100),
  content: z.string().min(20).max(10000),
  tags: z.array(z.string().max(20)).max(5),
  published: z.boolean().default(false),
});

type CreatePostInput = z.infer<typeof CreatePostSchema>;

type ActionResult =
  | { success: true; postId: string }
  | { success: false; error: string | Record<string, string[]> };

export async function createPost(formData: FormData): Promise<ActionResult> {
  // 1. Authenticate
  const session = await getSession();
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Parse form data
  const rawData = {
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.getAll('tags'),
    published: formData.get('published') === 'true',
  };

  // 3. Validate
  const result = CreatePostSchema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      error: result.error.flatten().fieldErrors,
    };
  }

  // 4. Authorize (user can only create their own posts)
  // 5. Execute
  try {
    const post = await db.post.create({
      data: {
        ...result.data,
        authorId: session.user.id,
      },
    });

    revalidatePath('/posts');
    return { success: true, postId: post.id };
  } catch (error) {
    console.error('Failed to create post:', error);
    return { success: false, error: 'Failed to create post' };
  }
}
```

## Anti-patterns

```tsx
// BAD: Trusting client-side validation
"use server";
export async function updateUser(data: { role: string }) {
  // Client "validated" this, but we can't trust it!
  await db.user.update({ data: { role: data.role } });
}

// BAD: Using any/unknown without validation
"use server";
export async function processData(data: any) {
  // No idea what data contains!
  await doSomething(data);
}

// BAD: Partial validation
"use server";
export async function updateSettings(formData: FormData) {
  const theme = formData.get('theme');
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error('Invalid theme');
  }
  // Forgot to validate other fields!
  const fontSize = formData.get('fontSize'); // Could be anything!
}
```

## Security Summary

| Check | Implementation |
|-------|---------------|
| Input validation | Zod schema at entry point |
| Authentication | Verify session exists |
| Authorization | User can perform this action |
| Rate limiting | Prevent abuse |
| Error handling | Don't leak internal errors |
