import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export interface Framework {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  website?: string;
  repository?: string;
  documentation?: string;
  technology: string;
  type: string;
  tags: string[];
  currentVersion?: string;
  supportedVersions?: string[];
  guidelinesCount: number;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  website?: string;
  type: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Guideline {
  title: string;
  slug: string;
  framework: string;
  category: string;
  version: string;
  description: string;
  tags: string[];
  minVersion?: string;
  deprecated: boolean;
  author: string;
  contributors: string[];
  createdAt: string;
  updatedAt: string;
  relatedGuidelines: string[];
  prerequisites: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  content: string;
}

export function getFrameworks(): Framework[] {
  const frameworksDir = path.join(CONTENT_DIR, 'frameworks');
  if (!fs.existsSync(frameworksDir)) return [];

  const files = fs.readdirSync(frameworksDir).filter(f => f.endsWith('.yaml'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(frameworksDir, file), 'utf-8');
    return yaml.load(content) as Framework;
  });
}

export function getFramework(slug: string): Framework | undefined {
  const frameworks = getFrameworks();
  return frameworks.find(f => f.slug === slug);
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

export function getGuidelines(): Guideline[] {
  const guidelinesDir = path.join(CONTENT_DIR, 'guidelines');
  if (!fs.existsSync(guidelinesDir)) return [];

  const guidelines: Guideline[] = [];

  const frameworks = fs.readdirSync(guidelinesDir);
  for (const framework of frameworks) {
    const frameworkDir = path.join(guidelinesDir, framework);
    if (!fs.statSync(frameworkDir).isDirectory()) continue;

    const categories = fs.readdirSync(frameworkDir);
    for (const category of categories) {
      const categoryDir = path.join(frameworkDir, category);
      if (!fs.statSync(categoryDir).isDirectory()) continue;

      const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(categoryDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);
        guidelines.push({
          ...data,
          content,
        } as Guideline);
      }
    }
  }

  return guidelines;
}

export function getGuidelinesByFramework(frameworkSlug: string): Guideline[] {
  return getGuidelines().filter(g => g.framework === frameworkSlug);
}

export function getGuideline(framework: string, category: string, slug: string): Guideline | undefined {
  return getGuidelines().find(
    g => g.framework === framework && g.category === category && g.slug === slug
  );
}

export function getAllTags(): { name: string; count: number }[] {
  const guidelines = getGuidelines();
  const tagCounts = new Map<string, number>();

  for (const guideline of guidelines) {
    for (const tag of guideline.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
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
