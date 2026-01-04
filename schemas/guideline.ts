import { z } from 'zod';

/**
 * Guideline frontmatter schema
 * Validates the YAML frontmatter in guideline Markdown files
 */
export const GuidelineFrontmatterSchema = z.object({
  // Required fields
  title: z.string().min(5).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  topic: z.string().regex(/^[a-z0-9-]+$/), // Was "framework" - now covers any subject (react, docker, accessibility, design, etc.)
  category: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),

  // Metadata
  description: z.string().min(20).max(300),
  tags: z.array(z.string()).min(1).max(10), // Cross-cutting concerns for discovery (e.g., accessibility, performance, security)

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

  // Relations - for "see also" and learning paths
  related: z.array(z.string()).default([]), // Paths to related guidelines (e.g., "forms/validation/error-messages")
  prerequisites: z.array(z.string()).default([]), // Guidelines to read first
  collections: z.array(z.string()).default([]), // Curated collections this belongs to (e.g., "frontend-fundamentals", "accessible-ui")

  // Content hints
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedReadTime: z.number().min(1).max(60),

  // AI-optimized fields (optional for backwards compatibility)
  ai: z.object({
    prompt_snippet: z.string().max(500),
    applies_when: z.array(z.string()).max(10),
    does_not_apply_when: z.array(z.string()).max(10),
    priority: z.enum(['critical', 'recommended', 'optional']),
    confidence: z.enum(['established', 'emerging', 'experimental']),
  }).optional(),

  // Changelog for versioned updates
  changelog: z.array(z.object({
    version: z.string(),
    date: z.string(),
    changes: z.array(z.string()),
  })).optional(),
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
  topic: z.string(),
  category: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedReadTime: z.number(),
  updatedAt: z.string(),
  path: z.string(),
  related: z.array(z.string()).optional(),
  collections: z.array(z.string()).optional(),
});

/**
 * Collection schema - curated groups of guidelines
 */
export const CollectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(3).max(100),
  description: z.string().min(20).max(500),
  icon: z.string().optional(), // Emoji or icon identifier
  guidelines: z.array(z.string()), // Paths to guidelines (e.g., "react/hooks/use-effect-cleanup")
  order: z.number().default(0), // Display order
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Collection = z.infer<typeof CollectionSchema>;

export type GuidelineSummary = z.infer<typeof GuidelineSummarySchema>;
