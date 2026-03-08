// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import vercel from '@astrojs/vercel';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://humanoidesyasociados.com',

  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
  devToolbar: {
    enabled: false
  },
  integrations: [
    react(),
    sitemap({
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: new Date('2026-02-09')
    }),
    mdx()
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
