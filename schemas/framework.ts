import { z } from 'zod';

/**
 * Topic schema
 * Represents any subject with guidelines: frameworks, libraries, concepts, tools, practices
 */
export const TopicSchema = z.object({
  // Identity
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),

  // Metadata
  description: z.string().max(500),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  repository: z.string().url().optional(),
  documentation: z.string().url().optional(),

  // Classification
  technology: z.string().optional(), // Parent technology (e.g., "javascript", "python") - optional for concepts
  type: z.enum(['framework', 'library', 'runtime', 'tool', 'platform', 'concept', 'practice']),
  tags: z.array(z.string()),

  // Version info (optional - not all topics have versions)
  currentVersion: z.string().optional(),
  supportedVersions: z.array(z.string()).default([]),

  // Guidelines stats
  guidelinesCount: z.number().default(0),
  categories: z.array(z.string()).default([]),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Topic = z.infer<typeof TopicSchema>;

// Backwards compatibility aliases
export const FrameworkSchema = TopicSchema;
export type Framework = Topic;

/**
 * Topic summary for listings
 */
export const TopicSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  logo: z.string().optional(),
  technology: z.string().optional(),
  type: z.enum(['framework', 'library', 'runtime', 'tool', 'platform', 'concept', 'practice']),
  guidelinesCount: z.number(),
  categories: z.array(z.string()),
});

export type TopicSummary = z.infer<typeof TopicSummarySchema>;

// Backwards compatibility aliases
export const FrameworkSummarySchema = TopicSummarySchema;
export type FrameworkSummary = TopicSummary;
