// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tinaDirective from "./astro-tina-directive/register"

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || "https://donayers.github.io",
	base: process.env.BASE_PATH || "/donayers.net",
	integrations: [mdx(), sitemap(), react(), tinaDirective()],
});
