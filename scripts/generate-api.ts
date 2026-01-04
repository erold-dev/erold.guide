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
  TopicSchema,
  TechnologySchema,
  type Manifest,
  type TopicIndex,
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
    const topics = await fs.readdir(guidelinesDir);

    for (const topic of topics) {
      const topicDir = path.join(guidelinesDir, topic);
      const stat = await fs.stat(topicDir);

      if (!stat.isDirectory()) continue;

      const categories = await fs.readdir(topicDir);

      for (const category of categories) {
        const categoryDir = path.join(topicDir, category);
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
 * Load all topics
 */
async function loadAllTopics(): Promise<
  ReturnType<typeof TopicSchema.parse>[]
> {
  const topics: ReturnType<typeof TopicSchema.parse>[] = [];
  const topicsDir = path.join(CONTENT_DIR, 'topics');

  try {
    const files = await fs.readdir(topicsDir);

    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

      const filePath = path.join(topicsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content) as Record<string, unknown>;

      try {
        const topic = TopicSchema.parse(data);
        topics.push(topic);
      } catch (error) {
        console.error(`  Error parsing ${filePath}:`, error);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return topics;
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
    topic: g.frontmatter.topic,
    category: g.frontmatter.category,
    description: g.frontmatter.description,
    tags: g.frontmatter.tags,
    difficulty: g.frontmatter.difficulty,
    estimatedReadTime: g.frontmatter.estimatedReadTime,
    updatedAt: g.frontmatter.updatedAt,
    path: `/guidelines/${g.frontmatter.topic}/${g.frontmatter.category}/${g.frontmatter.slug}`,
  };
}

/**
 * Generate topic index files
 */
async function generateTopicIndexes(
  guidelines: ParsedGuideline[],
  topics: ReturnType<typeof TopicSchema.parse>[]
): Promise<void> {
  console.log('\nGenerating topic indexes...');

  const byTopic = new Map<string, ParsedGuideline[]>();

  for (const g of guidelines) {
    const list = byTopic.get(g.frontmatter.topic) || [];
    list.push(g);
    byTopic.set(g.frontmatter.topic, list);
  }

  for (const topic of topics) {
    const topicGuidelines = byTopic.get(topic.slug) || [];
    const topicDir = path.join(OUTPUT_DIR, 'topics', topic.slug);

    // Group by category
    const byCategory = new Map<string, ParsedGuideline[]>();
    for (const g of topicGuidelines) {
      const list = byCategory.get(g.frontmatter.category) || [];
      list.push(g);
      byCategory.set(g.frontmatter.category, list);
    }

    // Main topic index
    const index: TopicIndex = {
      topic: {
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
        logo: topic.logo,
        technology: topic.technology,
        type: topic.type,
        guidelinesCount: topicGuidelines.length,
        categories: Array.from(byCategory.keys()),
      },
      generatedAt: new Date().toISOString(),
      contentHash: generateHash(JSON.stringify(topicGuidelines)),
      categories: Array.from(byCategory.entries()).map(([name, items]) => ({
        name,
        slug: name,
        description: `${name} guidelines for ${topic.name}`,
        guidelinesCount: items.length,
        path: `/api/v1/topics/${topic.slug}/${name}.json`,
      })),
      guidelines: topicGuidelines.map(toSummary),
    };

    await writeJson(path.join(topicDir, '_index.json'), index);

    // Category-specific indexes
    for (const [category, items] of byCategory) {
      await writeJson(path.join(topicDir, `${category}.json`), {
        topic: topic.slug,
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

    // Group by topic
    const byTopic: Record<
      string,
      { title: string; slug: string; description: string; path: string }[]
    > = {};

    for (const g of items) {
      if (!byTopic[g.frontmatter.topic]) {
        byTopic[g.frontmatter.topic] = [];
      }
      byTopic[g.frontmatter.topic].push({
        title: g.frontmatter.title,
        slug: g.frontmatter.slug,
        description: g.frontmatter.description,
        path: `/guidelines/${g.frontmatter.topic}/${g.frontmatter.category}/${g.frontmatter.slug}`,
      });
    }

    const index: TagIndex = {
      tag,
      generatedAt: new Date().toISOString(),
      byTopic,
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
): Promise<{ id: string; name: string; description: string; topics: string[] }[]> {
  console.log('\nGenerating stack indexes...');

  // Pre-defined common stacks
  const stacks = [
    {
      id: 'react-fullstack',
      name: 'React Full Stack',
      description: 'Full-stack React with Next.js and TypeScript',
      topics: ['react', 'nextjs', 'typescript'],
    },
    {
      id: 'python-api',
      name: 'Python API',
      description: 'Python backend with FastAPI',
      topics: ['python', 'fastapi'],
    },
  ];

  for (const stack of stacks) {
    const stackGuidelines = guidelines.filter((g) =>
      stack.topics.includes(g.frontmatter.topic)
    );

    const index: StackIndex = {
      id: stack.id,
      name: stack.name,
      description: stack.description,
      generatedAt: new Date().toISOString(),
      topics: stack.topics.map((t) => ({
        id: t,
        name: t,
        guidelinesCount: stackGuidelines.filter(
          (g) => g.frontmatter.topic === t
        ).length,
      })),
      guidelines: stackGuidelines.map((g) => ({
        title: g.frontmatter.title,
        slug: g.frontmatter.slug,
        topic: g.frontmatter.topic,
        category: g.frontmatter.category,
        description: g.frontmatter.description,
        path: `/guidelines/${g.frontmatter.topic}/${g.frontmatter.category}/${g.frontmatter.slug}`,
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
  topics: ReturnType<typeof TopicSchema.parse>[],
  technologies: ReturnType<typeof TechnologySchema.parse>[],
  tagCounts: Map<string, number>,
  stacks: { id: string; name: string; description: string; topics: string[] }[]
): Promise<void> {
  console.log('\nGenerating manifest...');

  const manifest: Manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    contentHash: generateHash(
      JSON.stringify({ guidelines: guidelines.length, topics, technologies })
    ),
    baseUrl: BASE_URL,
    apiBaseUrl: `${BASE_URL}/api/v1`,
    rawBaseUrl: `${BASE_URL}/raw`,
    stats: {
      totalGuidelines: guidelines.length,
      totalTopics: topics.length,
      totalTechnologies: technologies.length,
      totalTags: tagCounts.size,
      lastUpdated: new Date().toISOString(),
    },
    endpoints: {
      manifest: '/api/v1/manifest.json',
      technologies: '/api/v1/technologies.json',
      topics: '/api/v1/topics.json',
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
      topicsCount: t.frameworksCount, // Using existing field for backwards compat
    })),
    topics: topics.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      logo: t.logo,
      technology: t.technology,
      type: t.type,
      guidelinesCount: guidelines.filter((g) => g.frontmatter.topic === t.slug)
        .length,
      categories: t.categories,
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
      topics: s.topics,
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
  const topics = await loadAllTopics();
  const technologies = await loadAllTechnologies();

  console.log(`  Found ${guidelines.length} guidelines`);
  console.log(`  Found ${topics.length} topics`);
  console.log(`  Found ${technologies.length} technologies`);

  // Clear output directory
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await ensureDir(OUTPUT_DIR);

  // Generate all indexes
  await generateTopicIndexes(guidelines, topics);
  const tagCounts = await generateTagIndexes(guidelines);
  const stacks = await generateStackIndexes(guidelines);
  await generateManifest(guidelines, topics, technologies, tagCounts, stacks);

  // Generate flat listings
  await writeJson(path.join(OUTPUT_DIR, 'topics.json'), {
    generatedAt: new Date().toISOString(),
    topics: topics.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      logo: t.logo,
      technology: t.technology,
      guidelinesCount: guidelines.filter((g) => g.frontmatter.topic === t.slug)
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
      topicsCount: t.frameworksCount,
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
