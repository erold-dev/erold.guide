/**
 * API Index Generator
 *
 * This script generates all JSON index files for the erold.guide API.
 * Run during build: npm run build:api
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import {
  GuidelineFrontmatterSchema,
  FrameworkSchema,
  TechnologySchema,
  type Manifest,
  type FrameworkIndex,
  type TagIndex,
  type StackIndex,
  type GuidelineSummary,
} from '../schemas';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const OUTPUT_DIR = path.join(process.cwd(), 'dist', 'api', 'v1');
const BASE_URL = process.env.BASE_URL || 'https://erold.guide';

interface ParsedGuideline {
  frontmatter: ReturnType<typeof GuidelineFrontmatterSchema.parse>;
  rawContent: string;
  filePath: string;
}

/**
 * Generate content hash for cache invalidation
 */
function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

/**
 * Ensure output directory exists
 */
async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Write JSON file with pretty printing
 */
async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`  Generated: ${path.relative(process.cwd(), filePath)}`);
}

/**
 * Load all guideline files
 */
async function loadAllGuidelines(): Promise<ParsedGuideline[]> {
  const guidelines: ParsedGuideline[] = [];
  const guidelinesDir = path.join(CONTENT_DIR, 'guidelines');

  try {
    const frameworks = await fs.readdir(guidelinesDir);

    for (const framework of frameworks) {
      const frameworkDir = path.join(guidelinesDir, framework);
      const stat = await fs.stat(frameworkDir);

      if (!stat.isDirectory()) continue;

      const categories = await fs.readdir(frameworkDir);

      for (const category of categories) {
        const categoryDir = path.join(frameworkDir, category);
        const catStat = await fs.stat(categoryDir);

        if (!catStat.isDirectory()) continue;

        const files = await fs.readdir(categoryDir);

        for (const file of files) {
          if (!file.endsWith('.md')) continue;

          const filePath = path.join(categoryDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const { data, content: rawContent } = matter(content);

          try {
            const frontmatter = GuidelineFrontmatterSchema.parse(data);
            guidelines.push({
              frontmatter,
              rawContent,
              filePath: path.relative(CONTENT_DIR, filePath),
            });
          } catch (error) {
            console.error(`  Error parsing ${filePath}:`, error);
          }
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return guidelines;
}

/**
 * Load all frameworks
 */
async function loadAllFrameworks(): Promise<
  ReturnType<typeof FrameworkSchema.parse>[]
> {
  const frameworks: ReturnType<typeof FrameworkSchema.parse>[] = [];
  const frameworksDir = path.join(CONTENT_DIR, 'frameworks');

  try {
    const files = await fs.readdir(frameworksDir);

    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

      const filePath = path.join(frameworksDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content) as Record<string, unknown>;

      try {
        const framework = FrameworkSchema.parse(data);
        frameworks.push(framework);
      } catch (error) {
        console.error(`  Error parsing ${filePath}:`, error);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return frameworks;
}

/**
 * Load all technologies
 */
async function loadAllTechnologies(): Promise<
  ReturnType<typeof TechnologySchema.parse>[]
> {
  const technologies: ReturnType<typeof TechnologySchema.parse>[] = [];
  const techDir = path.join(CONTENT_DIR, 'technologies');

  try {
    const files = await fs.readdir(techDir);

    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

      const filePath = path.join(techDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content) as Record<string, unknown>;

      try {
        const tech = TechnologySchema.parse(data);
        technologies.push(tech);
      } catch (error) {
        console.error(`  Error parsing ${filePath}:`, error);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return technologies;
}

/**
 * Convert guideline to summary
 */
function toSummary(g: ParsedGuideline): GuidelineSummary {
  return {
    title: g.frontmatter.title,
    slug: g.frontmatter.slug,
    framework: g.frontmatter.framework,
    category: g.frontmatter.category,
    description: g.frontmatter.description,
    tags: g.frontmatter.tags,
    difficulty: g.frontmatter.difficulty,
    estimatedReadTime: g.frontmatter.estimatedReadTime,
    updatedAt: g.frontmatter.updatedAt,
    path: `/guidelines/${g.frontmatter.framework}/${g.frontmatter.category}/${g.frontmatter.slug}`,
  };
}

/**
 * Generate framework index files
 */
async function generateFrameworkIndexes(
  guidelines: ParsedGuideline[],
  frameworks: ReturnType<typeof FrameworkSchema.parse>[]
): Promise<void> {
  console.log('\nGenerating framework indexes...');

  const byFramework = new Map<string, ParsedGuideline[]>();

  for (const g of guidelines) {
    const list = byFramework.get(g.frontmatter.framework) || [];
    list.push(g);
    byFramework.set(g.frontmatter.framework, list);
  }

  for (const framework of frameworks) {
    const frameworkGuidelines = byFramework.get(framework.slug) || [];
    const frameworkDir = path.join(OUTPUT_DIR, 'frameworks', framework.slug);

    // Group by category
    const byCategory = new Map<string, ParsedGuideline[]>();
    for (const g of frameworkGuidelines) {
      const list = byCategory.get(g.frontmatter.category) || [];
      list.push(g);
      byCategory.set(g.frontmatter.category, list);
    }

    // Main framework index
    const index: FrameworkIndex = {
      framework: {
        id: framework.id,
        name: framework.name,
        slug: framework.slug,
        description: framework.description,
        logo: framework.logo,
        technology: framework.technology,
        type: framework.type,
        guidelinesCount: frameworkGuidelines.length,
        categories: Array.from(byCategory.keys()),
      },
      generatedAt: new Date().toISOString(),
      contentHash: generateHash(JSON.stringify(frameworkGuidelines)),
      categories: Array.from(byCategory.entries()).map(([name, items]) => ({
        name,
        slug: name,
        description: `${name} guidelines for ${framework.name}`,
        guidelinesCount: items.length,
        path: `/api/v1/frameworks/${framework.slug}/${name}.json`,
      })),
      guidelines: frameworkGuidelines.map(toSummary),
    };

    await writeJson(path.join(frameworkDir, '_index.json'), index);

    // Category-specific indexes
    for (const [category, items] of byCategory) {
      await writeJson(path.join(frameworkDir, `${category}.json`), {
        framework: framework.slug,
        category,
        generatedAt: new Date().toISOString(),
        guidelines: items.map(toSummary),
      });
    }
  }
}

/**
 * Generate tag index files
 */
async function generateTagIndexes(
  guidelines: ParsedGuideline[]
): Promise<Map<string, number>> {
  console.log('\nGenerating tag indexes...');

  const byTag = new Map<string, ParsedGuideline[]>();

  for (const g of guidelines) {
    for (const tag of g.frontmatter.tags) {
      const list = byTag.get(tag) || [];
      list.push(g);
      byTag.set(tag, list);
    }
  }

  const tagCounts = new Map<string, number>();

  for (const [tag, items] of byTag) {
    tagCounts.set(tag, items.length);

    // Group by framework
    const byFramework: Record<
      string,
      { title: string; slug: string; description: string; path: string }[]
    > = {};

    for (const g of items) {
      if (!byFramework[g.frontmatter.framework]) {
        byFramework[g.frontmatter.framework] = [];
      }
      byFramework[g.frontmatter.framework].push({
        title: g.frontmatter.title,
        slug: g.frontmatter.slug,
        description: g.frontmatter.description,
        path: `/guidelines/${g.frontmatter.framework}/${g.frontmatter.category}/${g.frontmatter.slug}`,
      });
    }

    const index: TagIndex = {
      tag,
      generatedAt: new Date().toISOString(),
      byFramework,
      totalCount: items.length,
    };

    await writeJson(path.join(OUTPUT_DIR, 'tags', `${tag}.json`), index);
  }

  return tagCounts;
}

/**
 * Generate stack indexes (pre-computed common stacks)
 */
async function generateStackIndexes(
  guidelines: ParsedGuideline[]
): Promise<{ id: string; name: string; description: string; frameworks: string[] }[]> {
  console.log('\nGenerating stack indexes...');

  // Pre-defined common stacks
  const stacks = [
    {
      id: 'react-fullstack',
      name: 'React Full Stack',
      description: 'Full-stack React with Next.js and TypeScript',
      frameworks: ['react', 'nextjs', 'typescript'],
    },
    {
      id: 'python-api',
      name: 'Python API',
      description: 'Python backend with FastAPI',
      frameworks: ['python', 'fastapi'],
    },
  ];

  for (const stack of stacks) {
    const stackGuidelines = guidelines.filter((g) =>
      stack.frameworks.includes(g.frontmatter.framework)
    );

    const index: StackIndex = {
      id: stack.id,
      name: stack.name,
      description: stack.description,
      generatedAt: new Date().toISOString(),
      frameworks: stack.frameworks.map((f) => ({
        id: f,
        name: f,
        guidelinesCount: stackGuidelines.filter(
          (g) => g.frontmatter.framework === f
        ).length,
      })),
      guidelines: stackGuidelines.map((g) => ({
        title: g.frontmatter.title,
        slug: g.frontmatter.slug,
        framework: g.frontmatter.framework,
        category: g.frontmatter.category,
        description: g.frontmatter.description,
        path: `/guidelines/${g.frontmatter.framework}/${g.frontmatter.category}/${g.frontmatter.slug}`,
      })),
    };

    await writeJson(path.join(OUTPUT_DIR, 'stacks', `${stack.id}.json`), index);
  }

  return stacks;
}

/**
 * Generate master manifest
 */
async function generateManifest(
  guidelines: ParsedGuideline[],
  frameworks: ReturnType<typeof FrameworkSchema.parse>[],
  technologies: ReturnType<typeof TechnologySchema.parse>[],
  tagCounts: Map<string, number>,
  stacks: { id: string; name: string; description: string; frameworks: string[] }[]
): Promise<void> {
  console.log('\nGenerating manifest...');

  const manifest: Manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    contentHash: generateHash(
      JSON.stringify({ guidelines: guidelines.length, frameworks, technologies })
    ),
    baseUrl: BASE_URL,
    apiBaseUrl: `${BASE_URL}/api/v1`,
    rawBaseUrl: `${BASE_URL}/raw`,
    stats: {
      totalGuidelines: guidelines.length,
      totalFrameworks: frameworks.length,
      totalTechnologies: technologies.length,
      totalTags: tagCounts.size,
      lastUpdated: new Date().toISOString(),
    },
    endpoints: {
      manifest: '/api/v1/manifest.json',
      technologies: '/api/v1/technologies.json',
      frameworks: '/api/v1/frameworks.json',
      tags: '/api/v1/tags.json',
      stacks: '/api/v1/stacks.json',
      search: '/api/v1/search.json',
    },
    technologies: technologies.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      logo: t.logo,
      type: t.type,
      frameworksCount: t.frameworksCount,
    })),
    frameworks: frameworks.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      description: f.description,
      logo: f.logo,
      technology: f.technology,
      type: f.type,
      guidelinesCount: guidelines.filter((g) => g.frontmatter.framework === f.slug)
        .length,
      categories: f.categories,
    })),
    tags: Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        path: `/api/v1/tags/${name}.json`,
      })),
    stacks: stacks.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      frameworks: s.frameworks,
      path: `/api/v1/stacks/${s.id}.json`,
    })),
  };

  await writeJson(path.join(OUTPUT_DIR, 'manifest.json'), manifest);
}

/**
 * Main build function
 */
async function main(): Promise<void> {
  console.log('erold.guide API Generator\n');
  console.log('Loading content...');

  const guidelines = await loadAllGuidelines();
  const frameworks = await loadAllFrameworks();
  const technologies = await loadAllTechnologies();

  console.log(`  Found ${guidelines.length} guidelines`);
  console.log(`  Found ${frameworks.length} frameworks`);
  console.log(`  Found ${technologies.length} technologies`);

  // Clear output directory
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await ensureDir(OUTPUT_DIR);

  // Generate all indexes
  await generateFrameworkIndexes(guidelines, frameworks);
  const tagCounts = await generateTagIndexes(guidelines);
  const stacks = await generateStackIndexes(guidelines);
  await generateManifest(guidelines, frameworks, technologies, tagCounts, stacks);

  // Generate flat listings
  await writeJson(path.join(OUTPUT_DIR, 'frameworks.json'), {
    generatedAt: new Date().toISOString(),
    frameworks: frameworks.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      description: f.description,
      logo: f.logo,
      technology: f.technology,
      guidelinesCount: guidelines.filter((g) => g.frontmatter.framework === f.slug)
        .length,
    })),
  });

  await writeJson(path.join(OUTPUT_DIR, 'technologies.json'), {
    generatedAt: new Date().toISOString(),
    technologies: technologies.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      logo: t.logo,
      type: t.type,
      frameworksCount: t.frameworksCount,
    })),
  });

  await writeJson(path.join(OUTPUT_DIR, 'tags.json'), {
    generatedAt: new Date().toISOString(),
    tags: Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        path: `/api/v1/tags/${name}.json`,
      })),
  });

  console.log('\nAPI generation complete!');
}

main().catch(console.error);
