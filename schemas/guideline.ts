import { z } from 'zod';

/**
 * Guideline frontmatter schema
 * Validates the YAML frontmatter in guideline Markdown files
 */
export const GuidelineFrontmatterSchema = z.object({
  // Required fields
  title: z.string().min(5).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  framework: z.string(),
  category: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),

  // Metadata
  description: z.string().min(20).max(300),
  tags: z.array(z.string()).min(1).max(10),

  // Versioning
  minVersion: z.string().optional(),
  maxVersion: z.string().optional(),
  deprecated: z.boolean().default(false),
  deprecatedMessage: z.string().optional(),

  // Attribution
  author: z.string(),
  contributors: z.array(z.string()).default([]),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Relations
  relatedGuidelines: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),

  // Content hints
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedReadTime: z.number().min(1).max(60),
});

export type GuidelineFrontmatter = z.infer<typeof GuidelineFrontmatterSchema>;

/**
 * Full guideline with content
 */
export const GuidelineSchema = GuidelineFrontmatterSchema.extend({
  content: z.string(),
  rawContent: z.string(),
  filePath: z.string(),
});

export type Guideline = z.infer<typeof GuidelineSchema>;

/**
 * Guideline summary for index files (lighter weight)
 */
export const GuidelineSummarySchema = z.object({
  title: z.string(),
  slug: z.string(),
  framework: z.string(),
  category: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedReadTime: z.number(),
  updatedAt: z.string(),
  path: z.string(),
});

export type GuidelineSummary = z.infer<typeof GuidelineSummarySchema>;
