// Schema exports
export * from './guideline';
export * from './framework';
export * from './technology';
export * from './manifest';

// Author schema
import { z } from 'zod';

/**
 * Author schema
 * Represents a content contributor
 */
export const AuthorSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  avatar: z.string().url().optional(),
  bio: z.string().max(300).optional(),
  github: z.string().optional(),
  twitter: z.string().optional(),
  website: z.string().url().optional(),
  verified: z.boolean().default(false),
  contributions: z.number().default(0),
  joinedAt: z.string().datetime(),
});

export type Author = z.infer<typeof AuthorSchema>;
