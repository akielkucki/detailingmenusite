// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Output stays static: every page prerenders at build time and is served from
// Cloudflare's asset store. Only /api/contact opts out (prerender = false), so
// the Worker runs just for form submissions.
export default defineConfig({
  adapter: cloudflare(),
  image: {
    domains: ["images.pexels.com"]
  },
  vite: {
    plugins: [tailwindcss()]
  }
});