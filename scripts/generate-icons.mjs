#!/usr/bin/env node
/**
 * Generate favicon and app icons from the source SVG
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

// Read the source SVG
const svgPath = join(publicDir, 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'mstile-150x150.png', size: 150 },
];

async function generateIcons() {
  console.log('Generating icons from favicon.svg...\n');

  for (const { name, size } of sizes) {
    const outputPath = join(publicDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (multi-size ICO)
  // ICO requires specific handling - we'll create a simple 32x32 version
  const ico32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();

  // Write as PNG for now (most browsers support .ico pointing to PNG)
  writeFileSync(join(publicDir, 'favicon.ico'), ico32);
  console.log('✓ favicon.ico (32x32)');

  // Generate OG image from og-image.svg
  const ogSvgPath = join(publicDir, 'og-image.svg');
  const ogSvgBuffer = readFileSync(ogSvgPath);
  await sharp(ogSvgBuffer)
    .resize(1200, 630)
    .png()
    .toFile(join(publicDir, 'og-image.png'));
  console.log('✓ og-image.png (1200x630)');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
