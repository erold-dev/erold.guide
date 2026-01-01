/**
 * Content Validation Script
 *
 * Validates all content files against their Zod schemas.
 * Run: npm run validate
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import {
  GuidelineFrontmatterSchema,
  FrameworkSchema,
  TechnologySchema,
  AuthorSchema,
} from '../schemas';

const CONTENT_DIR = path.join(process.cwd(), 'content');

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

const results: ValidationResult[] = [];

async function validateGuidelines(): Promise<void> {
  console.log('Validating guidelines...');
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
          const relativePath = path.relative(CONTENT_DIR, filePath);

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const { data } = matter(content);

            GuidelineFrontmatterSchema.parse(data);

            results.push({
              file: relativePath,
              valid: true,
              errors: [],
            });
          } catch (error) {
            const errors =
              error instanceof Error
                ? [error.message]
                : ['Unknown validation error'];

            results.push({
              file: relativePath,
              valid: false,
              errors,
            });
          }
        }
      }
    }
  } catch {
    console.log('  No guidelines directory found');
  }
}

async function validateFrameworks(): Promise<void> {
  console.log('Validating frameworks...');
  const frameworksDir = path.join(CONTENT_DIR, 'frameworks');

  try {
    const files = await fs.readdir(frameworksDir);

    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

      const filePath = path.join(frameworksDir, file);
      const relativePath = path.relative(CONTENT_DIR, filePath);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content) as Record<string, unknown>;

        FrameworkSchema.parse(data);

        results.push({
          file: relativePath,
          valid: true,
          errors: [],
        });
      } catch (error) {
        const errors =
          error instanceof Error
            ? [error.message]
            : ['Unknown validation error'];

        results.push({
          file: relativePath,
          valid: false,
          errors,
        });
      }
    }
  } catch {
    console.log('  No frameworks directory found');
  }
}

async function validateTechnologies(): Promise<void> {
  console.log('Validating technologies...');
  const techDir = path.join(CONTENT_DIR, 'technologies');

  try {
    const files = await fs.readdir(techDir);

    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

      const filePath = path.join(techDir, file);
      const relativePath = path.relative(CONTENT_DIR, filePath);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content) as Record<string, unknown>;

        TechnologySchema.parse(data);

        results.push({
          file: relativePath,
          valid: true,
          errors: [],
        });
      } catch (error) {
        const errors =
          error instanceof Error
            ? [error.message]
            : ['Unknown validation error'];

        results.push({
          file: relativePath,
          valid: false,
          errors,
        });
      }
    }
  } catch {
    console.log('  No technologies directory found');
  }
}

async function validateAuthors(): Promise<void> {
  console.log('Validating authors...');
  const authorsDir = path.join(CONTENT_DIR, 'authors');

  try {
    const files = await fs.readdir(authorsDir);

    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

      const filePath = path.join(authorsDir, file);
      const relativePath = path.relative(CONTENT_DIR, filePath);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content) as Record<string, unknown>;

        AuthorSchema.parse(data);

        results.push({
          file: relativePath,
          valid: true,
          errors: [],
        });
      } catch (error) {
        const errors =
          error instanceof Error
            ? [error.message]
            : ['Unknown validation error'];

        results.push({
          file: relativePath,
          valid: false,
          errors,
        });
      }
    }
  } catch {
    console.log('  No authors directory found');
  }
}

async function main(): Promise<void> {
  console.log('erold.guide Content Validator\n');

  await validateGuidelines();
  await validateFrameworks();
  await validateTechnologies();
  await validateAuthors();

  console.log('\n========================================');
  console.log('Validation Results');
  console.log('========================================\n');

  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);

  console.log(`Total files: ${results.length}`);
  console.log(`Valid: ${valid.length}`);
  console.log(`Invalid: ${invalid.length}`);

  if (invalid.length > 0) {
    console.log('\n--- Errors ---\n');

    for (const result of invalid) {
      console.log(`❌ ${result.file}`);
      for (const error of result.errors) {
        console.log(`   ${error}`);
      }
      console.log('');
    }

    process.exit(1);
  } else {
    console.log('\n✅ All content is valid!');
  }
}

main().catch(console.error);
