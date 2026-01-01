// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: process.env.BASE_URL || 'https://erold.guide',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [mdx()]
});