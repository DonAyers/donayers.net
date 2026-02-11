# Deployment Roadmap for donayers.net

**Date:** February 11, 2026  
**Purpose:** Analysis and roadmap for deploying donayers.net to GitHub Pages

---

## Executive Summary

This document outlines the current state of the donayers.net codebase and provides options for deploying it to GitHub Pages as a client-side static site. The project is an Astro-based website with TinaCMS integration for content management, featuring a cyberpunk-themed design with blog, music, and dev project sections.

---

## Current State Analysis

### Tech Stack
- **Framework:** Astro 5.14.7 (Static Site Generator)
- **CMS:** TinaCMS 2.9.0 (Git-backed headless CMS)
- **Styling:** Tailwind CSS 4.1.17 with custom cyberpunk theme
- **UI Framework:** React 18.3.1 (for interactive components)
- **Content:** MDX files for blog posts, music, and dev projects

### Project Structure
```
donayers.net/
├── src/
│   ├── pages/           # Astro pages (index, blog, music, dev)
│   ├── components/      # React components
│   ├── layouts/         # Page layouts (CyberLayout, BlogPost)
│   ├── content/         # Content collections (blog, music, dev, page)
│   └── styles/          # Global CSS with cyberpunk theme
├── tina/
│   ├── config.ts        # TinaCMS configuration
│   ├── collections/     # Content schema definitions
│   └── __generated__/   # Generated TinaCMS client
├── public/              # Static assets (images, fonts, admin)
└── astro-tina-directive/ # Custom Astro directive for TinaCMS
```

### Content Collections
1. **Blog** - 5 sample posts (MDX format)
2. **Music** - Music projects/releases collection
3. **Dev** - Development projects collection
4. **Page** - General pages collection

### Current Build Issues

1. **TinaCMS Configuration Issue**
   - The build script requires TinaCMS client ID and token
   - Error: "Client not configured properly. Missing clientId, token"
   - Current build command: `tinacms build && astro build`

2. **Dependency on TinaCMS Cloud**
   - The project is configured to use TinaCMS Cloud API
   - Generated client (`tina/__generated__/client.ts`) is empty
   - Content loaders in `src/content.config.ts` depend on TinaCMS GraphQL client

3. **No GitHub Actions Workflow**
   - No `.github/workflows/` directory exists
   - No automated deployment configured

4. **Environment Variables**
   - No `.env` file (correctly in .gitignore)
   - `GITHUB_BACKEND_SETUP.md` documents required variables but they're not set

---

## Deployment Options

### Option 1: TinaCMS Cloud + GitHub Pages (Recommended for CMS Features)

**Description:** Use TinaCMS Cloud for content management with GitHub Pages for hosting.

**Pros:**
- Full CMS capabilities with visual editing
- No backend server required
- Content editors can use the admin UI
- Automatic deploys on content changes

**Cons:**
- Requires TinaCMS Cloud account (free tier available)
- Adds complexity with external service dependency
- Requires API keys/tokens

**Implementation Steps:**
1. Sign up for TinaCMS Cloud (https://tina.io)
2. Create a new project and get client ID and token
3. Set environment variables for build:
   - `PUBLIC_TINA_CLIENT_ID`
   - `TINA_TOKEN`
   - `SITE_URL` (GitHub Pages URL)
4. Create GitHub Actions workflow for deployment
5. Configure GitHub Pages to deploy from `gh-pages` branch
6. Set GitHub repository secrets for TinaCMS credentials

**Estimated Complexity:** Medium  
**Estimated Time:** 2-4 hours

---

### Option 2: Local TinaCMS with GitHub Backend (Self-Hosted CMS)

**Description:** Use TinaCMS with GitHub as the backend (no TinaCMS Cloud).

**Pros:**
- No external service dependencies
- Free (only uses GitHub)
- Content stored directly in repository
- Still provides CMS interface for local editing

**Cons:**
- CMS only works locally during development
- Content editors need to run dev server
- More technical setup for content editing
- Requires GitHub Personal Access Token

**Implementation Steps:**
1. Modify `tina/config.ts` to remove TinaCMS Cloud dependency
2. Use `tinacms-gitprovider-github` for authentication
3. Create GitHub Personal Access Token with repo permissions
4. Set local environment variables:
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `GITHUB_BRANCH`
   - `GITHUB_PERSONAL_ACCESS_TOKEN`
5. Modify build process to skip TinaCMS build for production
6. Create simplified content loaders that read MDX files directly
7. Set up GitHub Actions workflow
8. Configure GitHub Pages

**Estimated Complexity:** Medium-High  
**Estimated Time:** 4-6 hours

---

### Option 3: Static-Only Build (No CMS - Simplest)

**Description:** Remove TinaCMS entirely and use Astro's native content collections.

**Pros:**
- Simplest approach
- Fastest build times
- No external dependencies
- Minimal configuration
- Easy to maintain

**Cons:**
- No CMS interface
- Content editing requires code changes
- All edits through Git commits
- Less user-friendly for non-technical editors

**Implementation Steps:**
1. Remove TinaCMS dependencies from `package.json`
2. Rewrite `src/content.config.ts` to use standard Astro content collections
3. Remove TinaCMS-specific code from components
4. Simplify build script to just `astro build`
5. Create GitHub Actions workflow for deployment
6. Configure GitHub Pages

**Estimated Complexity:** Low  
**Estimated Time:** 1-2 hours

---

### Option 4: Hybrid Approach (CMS for Dev, Static for Prod)

**Description:** Use TinaCMS during development but build as static site for production.

**Pros:**
- CMS benefits during development
- Static deployment (simple and fast)
- No production dependencies
- Best of both worlds for solo developer

**Cons:**
- Two different modes of operation
- Content updates require rebuilding
- Not suitable for non-technical editors

**Implementation Steps:**
1. Keep TinaCMS for `npm run dev`
2. Create separate build script that doesn't require TinaCMS
3. Modify content loaders to conditionally use TinaCMS or direct file reading
4. Set up environment variable to toggle modes
5. Create GitHub Actions workflow
6. Configure GitHub Pages

**Estimated Complexity:** Medium  
**Estimated Time:** 3-4 hours

---

## Recommended Approach

### For Solo Developer (You): **Option 3 - Static-Only Build**

**Reasoning:**
- Fastest to implement
- Lowest maintenance overhead
- No external service costs or dependencies
- Simple, reliable deployments
- Sufficient for a personal portfolio site
- Content is already in MDX files in the repository

### For Team/Non-Technical Editors: **Option 1 - TinaCMS Cloud**

**Reasoning:**
- Best user experience for content editing
- Visual editor for non-technical users
- Managed service handles complexity
- Free tier suitable for personal sites

---

## Implementation Tasks for Option 3 (Static-Only)

### Phase 1: Remove TinaCMS Dependencies (30 minutes)
- [ ] Update `package.json` - remove TinaCMS packages
- [ ] Update `astro.config.mjs` - remove TinaCMS directive if not needed
- [ ] Clean up `public/admin/` directory

### Phase 2: Rewrite Content Configuration (45 minutes)
- [ ] Modify `src/content.config.ts` to use file-based loaders
- [ ] Define proper content schemas for blog, music, dev, page
- [ ] Test content loading locally
- [ ] Update any components that reference TinaCMS-specific fields

### Phase 3: Setup GitHub Pages Deployment (30 minutes)
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Configure workflow to build and deploy to GitHub Pages
- [ ] Set repository settings for GitHub Pages
- [ ] Update `astro.config.mjs` with correct `site` URL
- [ ] Add `base` path if deploying to project page (e.g., `/donayers.net`)

### Phase 4: Testing & Validation (30 minutes)
- [ ] Test build locally (`npm run build`)
- [ ] Test preview locally (`npm run preview`)
- [ ] Verify all pages load correctly
- [ ] Check all links work
- [ ] Test responsive design
- [ ] Validate content renders properly

### Phase 5: First Deployment (15 minutes)
- [ ] Push changes to repository
- [ ] Verify GitHub Actions workflow runs
- [ ] Check deployed site on GitHub Pages
- [ ] Test all functionality on live site

---

## Implementation Tasks for Option 1 (TinaCMS Cloud)

### Phase 1: TinaCMS Cloud Setup (45 minutes)
- [ ] Sign up for TinaCMS Cloud account
- [ ] Create new project
- [ ] Get client ID and token
- [ ] Configure project settings

### Phase 2: Environment Configuration (30 minutes)
- [ ] Add GitHub repository secrets
- [ ] Update `tina/config.ts` with correct settings
- [ ] Test TinaCMS locally with credentials
- [ ] Verify content editing works

### Phase 3: Build Configuration (30 minutes)
- [ ] Ensure generated client is properly created
- [ ] Test build process locally
- [ ] Verify content loaders work
- [ ] Update any breaking changes

### Phase 4: GitHub Pages Deployment (30 minutes)
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Add TinaCMS credentials to secrets
- [ ] Configure GitHub Pages settings
- [ ] Set correct site URL

### Phase 5: Testing & Validation (45 minutes)
- [ ] Test full workflow locally
- [ ] Deploy to GitHub Pages
- [ ] Test content editing through admin UI
- [ ] Verify changes trigger rebuild
- [ ] Test all site functionality

---

## GitHub Actions Workflow Template

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      # For Option 1 (TinaCMS Cloud)
      - name: Build site
        env:
          PUBLIC_TINA_CLIENT_ID: ${{ secrets.TINA_CLIENT_ID }}
          TINA_TOKEN: ${{ secrets.TINA_TOKEN }}
          SITE_URL: https://donayers.github.io/donayers.net
        run: npm run build
        
      # For Option 3 (Static-Only)
      # - name: Build site
      #   run: npm run build
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./dist
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3
```

---

## Environment Variables Reference

### For TinaCMS Cloud (Option 1)
```bash
# .env (local development)
PUBLIC_TINA_CLIENT_ID=<your-client-id>
TINA_TOKEN=<your-token>
SITE_URL=https://donayers.github.io/donayers.net
```

### For GitHub Backend (Option 2)
```bash
# .env (local development)
GITHUB_OWNER=DonAyers
GITHUB_REPO=donayers.net
GITHUB_BRANCH=main
GITHUB_PERSONAL_ACCESS_TOKEN=<your-github-token>
SITE_URL=https://donayers.github.io/donayers.net
```

### For Static-Only (Option 3)
```bash
# .env (local development)
SITE_URL=https://donayers.github.io/donayers.net
```

---

## GitHub Pages Configuration

### Repository Settings
1. Go to repository Settings → Pages
2. Source: Deploy from a branch OR GitHub Actions
3. Branch: `gh-pages` (if using branch) or use GitHub Actions
4. Folder: `/ (root)`

### Base Path Configuration
If deploying to `https://username.github.io/repository-name/`:
```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://donayers.github.io',
  base: '/donayers.net',
  // ... other config
});
```

If deploying to custom domain or user page `https://username.github.io/`:
```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://donayers.github.io',
  // ... other config
});
```

---

## Next Steps

1. **Choose an option** based on your needs:
   - Solo developer with code experience → Option 3
   - Need CMS for others → Option 1
   - Want flexibility → Option 4

2. **Review the implementation tasks** for your chosen option

3. **Set up GitHub repository settings** for Pages deployment

4. **Follow the phase-by-phase implementation** plan

5. **Test thoroughly** before going live

---

## Additional Considerations

### Custom Domain (Optional)
- Add CNAME file to `public/` directory
- Configure DNS settings with your domain provider
- Update `site` URL in `astro.config.mjs`

### Performance Optimization
- Optimize images in `public/` directory
- Consider using Astro's image optimization
- Enable Astro's built-in optimizations

### SEO Enhancements
- Add sitemap (already included via `@astrojs/sitemap`)
- Add RSS feed (already included via `@astrojs/rss`)
- Add meta tags and Open Graph tags
- Create robots.txt file

### Security
- Review and fix npm audit vulnerabilities (21 found)
- Keep dependencies updated
- Use environment variables for sensitive data

### Content Migration
- Review existing content in `src/content/`
- Update placeholder content with real content
- Optimize images and assets
- Check all internal links

---

## Questions to Answer

Before proceeding, consider:

1. **Who will be editing content?**
   - Just you (developer) → Options 3 or 4
   - Non-technical editors → Option 1

2. **What's your budget for hosting/services?**
   - $0 (free) → Options 2, 3, or 4
   - Can pay for convenience → Option 1 (TinaCMS Cloud free tier is generous)

3. **How frequently will content be updated?**
   - Rarely → Any option works
   - Frequently → Option 1 for better UX

4. **Do you want a CMS interface?**
   - Yes → Options 1, 2, or 4
   - No → Option 3

5. **What's your timeline?**
   - Need it today → Option 3
   - Can spend a few hours → Any option

---

## Conclusion

The donayers.net codebase is well-structured and nearly ready for deployment. The main blocker is the TinaCMS configuration, which can be resolved by either:
1. Setting up TinaCMS Cloud (easiest for CMS features)
2. Removing TinaCMS (fastest to deploy)
3. Using a hybrid approach (flexible for solo dev)

**Recommendation:** Start with Option 3 (Static-Only) to get deployed quickly, then optionally add TinaCMS later if needed. This provides immediate value with the least complexity and can be enhanced incrementally.

Total estimated time to deployment: **2-4 hours** depending on chosen option.
