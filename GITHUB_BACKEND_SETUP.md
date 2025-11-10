# GitHub Backend Setup for TinaCMS

This project is configured to use GitHub as the backend for TinaCMS. All content edits will be committed directly to your repository.

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Set the name to something like "TinaCMS"
4. Select these scopes:
   - `repo` (full control of private repositories)
   - `workflow` (optional, for CI/CD)
5. Click "Generate token"
6. Copy the token (you won't be able to see it again!)

### 2. Create a `.env` file

Copy `.env.example` to `.env` and fill in your values:

```bash
SITE_URL=https://your-domain.com

# GitHub Configuration
GITHUB_OWNER=your-github-username-or-org
GITHUB_REPO=your-repository-name
GITHUB_BRANCH=main
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxx
```

### 3. Environment Variables Explained

- **GITHUB_OWNER**: Your GitHub username or organization name
- **GITHUB_REPO**: The repository name (e.g., "donayers.net")
- **GITHUB_BRANCH**: The branch to edit (default: "main")
- **GITHUB_PERSONAL_ACCESS_TOKEN**: Your GitHub personal access token (keep this secret!)

### 4. Running TinaCMS

The dev script already handles TinaCMS:

```bash
npm run dev
```

This will start:
- TinaCMS admin UI (usually at `http://localhost:3000/admin`)
- Astro dev server (usually at `http://localhost:3000`)

## Features

✅ All content stored in Git (no backend costs)
✅ Visual editing in TinaCMS admin
✅ Images stored in `public/images/` directory (committed to Git)
✅ Full git history for all changes
✅ Deploy anywhere that supports static sites

## How It Works

1. You edit content in the TinaCMS admin UI
2. Changes are automatically committed to your GitHub repository
3. Your CI/CD pipeline (Vercel, GitHub Pages, etc.) rebuilds the site
4. Updated site is deployed

## Troubleshooting

**"Authentication failed" error?**
- Check that your GitHub token is correct
- Ensure the token hasn't expired
- Verify `GITHUB_OWNER` and `GITHUB_REPO` match your repository

**Images not uploading?**
- Images are saved to `public/images/` 
- This folder should be in your `.gitignore` (or added to Git to version control them)

**Changes not showing up?**
- TinaCMS should automatically commit to GitHub
- Check your repository's commit history
- Verify your CI/CD is re-building the site
