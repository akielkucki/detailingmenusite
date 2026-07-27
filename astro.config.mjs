// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  image: {
    domains: ["images.pexels.com"]
  },
  vite: {
    plugins: [tailwindcss()]
  }
});