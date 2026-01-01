import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import yaml from 'js-yaml';
import {
  GuidelineFrontmatterSchema,
  FrameworkSchema,
  TechnologySchema,
  type Guideline,
  type GuidelineSummary,
  type Framework,
  type Technology,
} from '../../schemas';

const CONTENT_DIR = path.join(process.cwd(), 'content');

/**
 * Load and parse a guideline markdown file
 */
export async function loadGuideline(filePath: string): Promise<Guideline> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data, content: rawContent } = matter(content);

  const frontmatter = GuidelineFrontmatterSchema.parse(data);
  const htmlContent = await marked(rawContent);

  return {
    ...frontmatter,
    content: htmlContent,
    rawContent,
    filePath: path.relative(CONTENT_DIR, filePath),
  };
}

/**
 * Load all guidelines from a framework directory
 */
export async function loadGuidelinesForFramework(
  framework: string
): Promise<Guideline[]> {
  const frameworkDir = path.join(CONTENT_DIR, 'guidelines', framework);
  const guidelines: Guideline[] = [];

  try {
    const categories = await fs.readdir(frameworkDir);

    for (const category of categories) {
      const categoryDir = path.join(frameworkDir, category);
      const stat = await fs.stat(categoryDir);

      if (stat.isDirectory()) {
        const files = await fs.readdir(categoryDir);

        for (const file of files) {
          if (file.endsWith('.md')) {
            const guideline = await loadGuideline(
              path.join(categoryDir, file)
            );
            guidelines.push(guideline);
          }
        }
      }
    }
  } catch {
    // Framework directory doesn't exist
  }

  return guidelines;
}

/**
 * Load all guidelines across all frameworks
 */
export async function loadAllGuidelines(): Promise<Guideline[]> {
  const guidelinesDir = path.join(CONTENT_DIR, 'guidelines');
  const allGuidelines: Guideline[] = [];

  try {
    const frameworks = await fs.readdir(guidelinesDir);

    for (const framework of frameworks) {
      const guidelines = await loadGuidelinesForFramework(framework);
      allGuidelines.push(...guidelines);
    }
  } catch {
    // Guidelines directory doesn't exist
  }

  return allGuidelines;
}

/**
 * Load a framework definition
 */
export async function loadFramework(slug: string): Promise<Framework | null> {
  const filePath = path.join(CONTENT_DIR, 'frameworks', `${slug}.yaml`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = yaml.load(content) as Record<string, unknown>;
    return FrameworkSchema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Load all frameworks
 */
export async function loadAllFrameworks(): Promise<Framework[]> {
  const frameworksDir = path.join(CONTENT_DIR, 'frameworks');
  const frameworks: Framework[] = [];

  try {
    const files = await fs.readdir(frameworksDir);

    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const slug = file.replace(/\.(yaml|yml)$/, '');
        const framework = await loadFramework(slug);
        if (framework) {
          frameworks.push(framework);
        }
      }
    }
  } catch {
    // Frameworks directory doesn't exist
  }

  return frameworks;
}

/**
 * Load a technology definition
 */
export async function loadTechnology(slug: string): Promise<Technology | null> {
  const filePath = path.join(CONTENT_DIR, 'technologies', `${slug}.yaml`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = yaml.load(content) as Record<string, unknown>;
    return TechnologySchema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Load all technologies
 */
export async function loadAllTechnologies(): Promise<Technology[]> {
  const techDir = path.join(CONTENT_DIR, 'technologies');
  const technologies: Technology[] = [];

  try {
    const files = await fs.readdir(techDir);

    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const slug = file.replace(/\.(yaml|yml)$/, '');
        const tech = await loadTechnology(slug);
        if (tech) {
          technologies.push(tech);
        }
      }
    }
  } catch {
    // Technologies directory doesn't exist
  }

  return technologies;
}

/**
 * Convert guideline to summary (lighter weight for indexes)
 */
export function guidelineToSummary(guideline: Guideline): GuidelineSummary {
  return {
    title: guideline.title,
    slug: guideline.slug,
    framework: guideline.framework,
    category: guideline.category,
    description: guideline.description,
    tags: guideline.tags,
    difficulty: guideline.difficulty,
    estimatedReadTime: guideline.estimatedReadTime,
    updatedAt: guideline.updatedAt,
    path: `/guidelines/${guideline.framework}/${guideline.category}/${guideline.slug}`,
  };
}

/**
 * Group guidelines by category
 */
export function groupByCategory(
  guidelines: Guideline[]
): Record<string, Guideline[]> {
  return guidelines.reduce(
    (acc, guideline) => {
      const category = guideline.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(guideline);
      return acc;
    },
    {} as Record<string, Guideline[]>
  );
}

/**
 * Group guidelines by tag
 */
export function groupByTag(
  guidelines: Guideline[]
): Record<string, Guideline[]> {
  const byTag: Record<string, Guideline[]> = {};

  for (const guideline of guidelines) {
    for (const tag of guideline.tags) {
      if (!byTag[tag]) {
        byTag[tag] = [];
      }
      byTag[tag].push(guideline);
    }
  }

  return byTag;
}

/**
 * Get all unique tags from guidelines
 */
export function getAllTags(guidelines: Guideline[]): string[] {
  const tags = new Set<string>();

  for (const guideline of guidelines) {
    for (const tag of guideline.tags) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort();
}
