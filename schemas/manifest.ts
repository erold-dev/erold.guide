import { z } from 'zod';
import { TechnologySummarySchema } from './technology';
import { FrameworkSummarySchema } from './framework';

/**
 * API Manifest schema
 * The master index file that agents fetch first
 */
export const ManifestSchema = z.object({
  // API info
  version: z.literal('1.0.0'),
  generatedAt: z.string().datetime(),
  contentHash: z.string(), // For cache invalidation

  // Base URLs
  baseUrl: z.string().url(),
  apiBaseUrl: z.string().url(),
  rawBaseUrl: z.string().url(),

  // Statistics
  stats: z.object({
    totalGuidelines: z.number(),
    totalFrameworks: z.number(),
    totalTechnologies: z.number(),
    totalTags: z.number(),
    lastUpdated: z.string().datetime(),
  }),

  // Available endpoints
  endpoints: z.object({
    manifest: z.string(),
    technologies: z.string(),
    frameworks: z.string(),
    tags: z.string(),
    stacks: z.string(),
    search: z.string(),
  }),

  // Quick access to top-level resources
  technologies: z.array(TechnologySummarySchema),
  frameworks: z.array(FrameworkSummarySchema),

  // Available tags
  tags: z.array(
    z.object({
      name: z.string(),
      count: z.number(),
      path: z.string(),
    })
  ),

  // Pre-computed stacks
  stacks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      frameworks: z.array(z.string()),
      path: z.string(),
    })
  ),
});

export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * Framework index schema
 * Index file for all guidelines in a framework
 */
export const FrameworkIndexSchema = z.object({
  framework: FrameworkSummarySchema,
  generatedAt: z.string().datetime(),
  contentHash: z.string(),

  // Categories with guidelines
  categories: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
      description: z.string(),
      guidelinesCount: z.number(),
      path: z.string(),
    })
  ),

  // All guidelines (summaries)
  guidelines: z.array(
    z.object({
      title: z.string(),
      slug: z.string(),
      category: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      updatedAt: z.string(),
      path: z.string(),
    })
  ),
});

export type FrameworkIndex = z.infer<typeof FrameworkIndexSchema>;

/**
 * Tag index schema
 * Cross-framework index by tag
 */
export const TagIndexSchema = z.object({
  tag: z.string(),
  generatedAt: z.string().datetime(),

  // Guidelines grouped by framework
  byFramework: z.record(
    z.array(
      z.object({
        title: z.string(),
        slug: z.string(),
        description: z.string(),
        path: z.string(),
      })
    )
  ),

  // Total count
  totalCount: z.number(),
});

export type TagIndex = z.infer<typeof TagIndexSchema>;

/**
 * Stack index schema
 * Pre-computed common technology stacks
 */
export const StackIndexSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  generatedAt: z.string().datetime(),

  // Frameworks in this stack
  frameworks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      guidelinesCount: z.number(),
    })
  ),

  // All guidelines for this stack
  guidelines: z.array(
    z.object({
      title: z.string(),
      slug: z.string(),
      framework: z.string(),
      category: z.string(),
      description: z.string(),
      path: z.string(),
    })
  ),
});

export type StackIndex = z.infer<typeof StackIndexSchema>;
