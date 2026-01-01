import { z } from 'zod';

/**
 * Framework schema
 * Represents a framework or library (e.g., Next.js, React, FastAPI)
 */
export const FrameworkSchema = z.object({
  // Identity
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),

  // Metadata
  description: z.string().max(500),
  logo: z.string().url().optional(),
  website: z.string().url(),
  repository: z.string().url().optional(),
  documentation: z.string().url(),

  // Classification
  technology: z.string(), // Parent technology (e.g., "javascript", "python")
  type: z.enum(['framework', 'library', 'runtime', 'tool', 'platform']),
  tags: z.array(z.string()),

  // Version info
  currentVersion: z.string(),
  supportedVersions: z.array(z.string()).default([]),

  // Guidelines stats
  guidelinesCount: z.number().default(0),
  categories: z.array(z.string()).default([]),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Framework = z.infer<typeof FrameworkSchema>;

/**
 * Framework summary for listings
 */
export const FrameworkSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  logo: z.string().optional(),
  technology: z.string(),
  type: z.enum(['framework', 'library', 'runtime', 'tool', 'platform']),
  guidelinesCount: z.number(),
  categories: z.array(z.string()),
});

export type FrameworkSummary = z.infer<typeof FrameworkSummarySchema>;
