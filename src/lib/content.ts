import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  website?: string;
  repository?: string;
  documentation?: string;
  technology?: string; // Optional - not all topics are technologies
  type: string;
  tags: string[];
  currentVersion?: string;
  supportedVersions?: string[];
  guidelinesCount: number;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

// Backwards compatibility alias
export type Framework = Topic;

export interface Guideline {
  // Core identification
  title: string;
  slug: string;
  topic: string; // Was "framework" - now covers any subject
  category: string;
  version: string;
  description: string;
  tags: string[];

  // Versioning & compatibility
  minVersion?: string;
  maxVersion?: string;
  deprecated: boolean;
  deprecatedReason?: string;
  supersededBy?: string;

  // Authorship
  author: string;
  contributors: string[];
  createdAt: string;
  updatedAt: string;

  // Relationships
  related: string[]; // Was "relatedGuidelines" - paths to related guidelines
  prerequisites: string[];
  collections: string[]; // Curated collections this belongs to

  // Reading metadata
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;

  // AI-optimized fields
  ai?: {
    prompt_snippet: string;
    applies_when: string[];
    does_not_apply_when: string[];
    priority: 'critical' | 'recommended' | 'optional';
    confidence: 'established' | 'emerging' | 'experimental';
  };

  // Changelog for versioned updates
  changelog?: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;

  // The actual content
  content: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  icon?: string;
  guidelines: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export function getTopics(): Topic[] {
  // Try topics directory first, fall back to frameworks for backwards compatibility
  let topicsDir = path.join(CONTENT_DIR, 'topics');
  if (!fs.existsSync(topicsDir)) {
    topicsDir = path.join(CONTENT_DIR, 'frameworks');
    if (!fs.existsSync(topicsDir)) return [];
  }

  const files = fs.readdirSync(topicsDir).filter(f => f.endsWith('.yaml'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(topicsDir, file), 'utf-8');
    return yaml.load(content) as Topic;
  });
}

// Backwards compatibility alias
export function getFrameworks(): Topic[] {
  return getTopics();
}

export function getTopic(slug: string): Topic | undefined {
  const topics = getTopics();
  return topics.find(t => t.slug === slug);
}

// Backwards compatibility alias
export function getFramework(slug: string): Topic | undefined {
  return getTopic(slug);
}

export function getCollections(): Collection[] {
  const collectionsDir = path.join(CONTENT_DIR, 'collections');
  if (!fs.existsSync(collectionsDir)) return [];

  const files = fs.readdirSync(collectionsDir).filter(f => f.endsWith('.yaml'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(collectionsDir, file), 'utf-8');
    return yaml.load(content) as Collection;
  }).sort((a, b) => a.order - b.order);
}

export function getCollection(id: string): Collection | undefined {
  const collections = getCollections();
  return collections.find(c => c.id === id);
}

export function getGuidelines(): Guideline[] {
  const guidelinesDir = path.join(CONTENT_DIR, 'guidelines');
  if (!fs.existsSync(guidelinesDir)) return [];

  const guidelines: Guideline[] = [];

  const topics = fs.readdirSync(guidelinesDir);
  for (const topic of topics) {
    const topicDir = path.join(guidelinesDir, topic);
    if (!fs.statSync(topicDir).isDirectory()) continue;

    const categories = fs.readdirSync(topicDir);
    for (const category of categories) {
      const categoryDir = path.join(topicDir, category);
      if (!fs.statSync(categoryDir).isDirectory()) continue;

      const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(categoryDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        // Support both old "framework" and new "topic" fields
        const guideline = {
          ...data,
          topic: data.topic || data.framework, // Backwards compatibility
          related: data.related || data.relatedGuidelines || [],
          collections: data.collections || [],
          content,
        } as Guideline;

        guidelines.push(guideline);
      }
    }
  }

  return guidelines;
}

export function getGuidelinesByTopic(topicSlug: string): Guideline[] {
  return getGuidelines().filter(g => g.topic === topicSlug);
}

// Backwards compatibility alias
export function getGuidelinesByFramework(frameworkSlug: string): Guideline[] {
  return getGuidelinesByTopic(frameworkSlug);
}

export function getGuidelinesByCollection(collectionId: string): Guideline[] {
  return getGuidelines().filter(g => g.collections?.includes(collectionId));
}

export function getGuidelinesByTag(tag: string): Guideline[] {
  return getGuidelines().filter(g => g.tags?.includes(tag));
}

export function getGuideline(topic: string, category: string, slug: string): Guideline | undefined {
  return getGuidelines().find(
    g => g.topic === topic && g.category === category && g.slug === slug
  );
}

export function getRelatedGuidelines(guideline: Guideline): Guideline[] {
  if (!guideline.related || guideline.related.length === 0) return [];

  const allGuidelines = getGuidelines();
  return guideline.related
    .map(relPath => {
      const parts = relPath.split('/');
      if (parts.length === 3) {
        return allGuidelines.find(g =>
          g.topic === parts[0] && g.category === parts[1] && g.slug === parts[2]
        );
      }
      return undefined;
    })
    .filter((g): g is Guideline => g !== undefined);
}

export function getAllTags(): { name: string; count: number }[] {
  const guidelines = getGuidelines();
  const tagCounts = new Map<string, number>();

  for (const guideline of guidelines) {
    for (const tag of guideline.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAllTopics(): { name: string; count: number }[] {
  const guidelines = getGuidelines();
  const topicCounts = new Map<string, number>();

  for (const guideline of guidelines) {
    topicCounts.set(guideline.topic, (topicCounts.get(guideline.topic) || 0) + 1);
  }

  return Array.from(topicCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAllCategories(): { name: string; count: number }[] {
  const guidelines = getGuidelines();
  const categoryCounts = new Map<string, number>();

  for (const guideline of guidelines) {
    const key = guideline.category;
    categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
  }

  return Array.from(categoryCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  website?: string;
  documentation?: string;
  type: string;
  paradigms?: string[];
  tags?: string[];
  frameworks?: string[];
  frameworksCount?: number;
  createdAt: string;
  updatedAt: string;
}

export function getTechnologies(): Technology[] {
  const techDir = path.join(CONTENT_DIR, 'technologies');
  if (!fs.existsSync(techDir)) return [];

  const files = fs.readdirSync(techDir).filter(f => f.endsWith('.yaml'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(techDir, file), 'utf-8');
    return yaml.load(content) as Technology;
  });
}

export function getTechnology(slug: string): Technology | undefined {
  const technologies = getTechnologies();
  return technologies.find(t => t.slug === slug);
}

export function getTopicsByTechnology(technologySlug: string): Topic[] {
  const topics = getTopics();
  return topics.filter(t => t.technology === technologySlug);
}
