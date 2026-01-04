import { z } from 'zod';
import { TechnologySummarySchema } from './technology';
import { TopicSummarySchema } from './framework';

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
    totalTopics: z.number(),
    totalTechnologies: z.number(),
    totalTags: z.number(),
    lastUpdated: z.string().datetime(),
  }),

  // Available endpoints
  endpoints: z.object({
    manifest: z.string(),
    technologies: z.string(),
    topics: z.string(),
    tags: z.string(),
    stacks: z.string(),
    search: z.string(),
  }),

  // Quick access to top-level resources
  technologies: z.array(TechnologySummarySchema),
  topics: z.array(TopicSummarySchema),

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
      topics: z.array(z.string()),
      path: z.string(),
    })
  ),
});

export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * Topic index schema
 * Index file for all guidelines in a topic
 */
export const TopicIndexSchema = z.object({
  topic: TopicSummarySchema,
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

export type TopicIndex = z.infer<typeof TopicIndexSchema>;

// Backwards compatibility alias
export const FrameworkIndexSchema = TopicIndexSchema;
export type FrameworkIndex = TopicIndex;

/**
 * Tag index schema
 * Cross-topic index by tag
 */
export const TagIndexSchema = z.object({
  tag: z.string(),
  generatedAt: z.string().datetime(),

  // Guidelines grouped by topic
  byTopic: z.record(
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

  // Topics in this stack
  topics: z.array(
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
      topic: z.string(),
      category: z.string(),
      description: z.string(),
      path: z.string(),
    })
  ),
});

export type StackIndex = z.infer<typeof StackIndexSchema>;
