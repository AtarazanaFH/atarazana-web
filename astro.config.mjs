import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://atarazana.house',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
});
