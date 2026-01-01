import { z } from 'zod';

/**
 * Technology schema
 * Represents a programming language or platform (e.g., JavaScript, Python, Rust)
 */
export const TechnologySchema = z.object({
  // Identity
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),

  // Metadata
  description: z.string().max(500),
  logo: z.string().url().optional(),
  website: z.string().url(),
  documentation: z.string().url().optional(),

  // Classification
  type: z.enum(['language', 'platform', 'runtime']),
  paradigms: z.array(z.string()).default([]),
  tags: z.array(z.string()),

  // Related frameworks
  frameworks: z.array(z.string()).default([]),
  frameworksCount: z.number().default(0),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Technology = z.infer<typeof TechnologySchema>;

/**
 * Technology summary for listings
 */
export const TechnologySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  logo: z.string().optional(),
  type: z.enum(['language', 'platform', 'runtime']),
  frameworksCount: z.number(),
});

export type TechnologySummary = z.infer<typeof TechnologySummarySchema>;
