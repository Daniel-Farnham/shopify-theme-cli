# Shopify Theme CLI - Distribution Guide

This document explains how to distribute and use the Shopify Theme CLI in other repositories.

## Overview

The Shopify Theme CLI provides a safe development workflow for Shopify themes with:
- Live theme protection (cannot accidentally push to live)
- Content syncing from live theme
- Interactive theme selection
- Safety verification before all operations

---

## Option 1: npx from GitHub (Recommended for Now)

### Setup

1. **Create a GitHub repository** for the CLI:
   ```bash
   # In the shopify-theme-cli directory
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create shopify-theme-cli --private --source=. --push
   ```

2. **In your theme repository**, create a `shopify.theme.toml`:
   ```toml
   [environments.env1]
   store = "your-store.myshopify.com"
   password = "shptka_xxxxx"
   ```

3. **Run commands via npx**:
   ```bash
   # Replace YOUR_USERNAME with your GitHub username
   npx github:YOUR_USERNAME/shopify-theme-cli dev
   npx github:YOUR_USERNAME/shopify-theme-cli push
   npx github:YOUR_USERNAME/shopify-theme-cli list
   ```

### Adding npm scripts to theme repos

In your theme's `package.json`:
```json
{
  "scripts": {
    "dev": "npx github:YOUR_USERNAME/shopify-theme-cli dev",
    "push": "npx github:YOUR_USERNAME/shopify-theme-cli push",
    "list": "npx github:YOUR_USERNAME/shopify-theme-cli list"
  }
}
```

Then just run:
```bash
npm run dev
```

---

## Option 2: npm Package (For Wider Distribution)

### Publishing to npm

1. **Create an npm account** at https://www.npmjs.com/signup

2. **Update package.json** with your details:
   ```json
   {
     "name": "@your-org/shopify-theme-cli",
     "version": "1.0.0",
     "repository": {
       "type": "git",
       "url": "git+https://github.com/YOUR_USERNAME/shopify-theme-cli.git"
     },
     "author": "Your Name",
     "license": "MIT"
   }
   ```

3. **Login and publish**:
   ```bash
   npm login
   npm publish --access public
   # or for scoped private packages:
   npm publish --access restricted
   ```

4. **Use in other projects**:
   ```bash
   # Global install
   npm install -g @your-org/shopify-theme-cli
   theme-cli dev

   # Or as dev dependency
   npm install -D @your-org/shopify-theme-cli
   npx theme-cli dev
   ```

### Updating the package

```bash
# Bump version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Publish update
npm publish
```

---

## Option 3: Git Submodule

### Adding to a theme repo

```bash
# Add as submodule
git submodule add https://github.com/YOUR_USERNAME/shopify-theme-cli.git .cli

# Install dependencies
cd .cli && npm install && cd ..

# Add to package.json scripts
{
  "scripts": {
    "dev": "node .cli/scripts/dev.mjs",
    "push": "node .cli/scripts/push.mjs",
    "list": "node .cli/scripts/list.mjs"
  }
}
```

### Updating submodule

```bash
cd .cli
git pull origin main
cd ..
git add .cli
git commit -m "Update CLI submodule"
```

---

## Configuration

### shopify.theme.toml

Each theme repository needs this file in its root:

```toml
[environments.env1]
store = "your-store.myshopify.com"
password = "shptka_xxxxx"
```

**Important**: Add `shopify.theme.toml` to `.gitignore` to avoid committing credentials:
```gitignore
shopify.theme.toml
```

### Getting Store Credentials

1. Go to Shopify Admin → Apps → Theme Access
2. Create a new password
3. Copy the password (starts with `shptka_`)

---

## Commands

| Command | Description |
|---------|-------------|
| `theme-cli dev` | Select a dev theme, sync content from live, start dev server |
| `theme-cli push` | Select a dev theme, push local files to it |
| `theme-cli list` | List all themes (newest first) |
| `theme-cli help` | Show help |

---

## Safety Features

1. **Live theme auto-detection**: Fetches live theme ID fresh each time
2. **Live excluded from selection**: Cannot select live theme
3. **ID verification**: Programmatically verifies selected ≠ live
4. **Role verification**: Double-checks theme role isn't "live"
5. **Visual confirmation**: Shows both theme IDs before proceeding
6. **User confirmation**: Must confirm before dev/push operations

---

## Content Sync

When running `dev`, the following content is synced from the live theme:

- `config/settings_data.json` - Theme settings
- `locales/*` - Translation files
- `templates/*.json` - Template JSON files
- `templates/**/*.json` - Nested template JSON files

**Not synced** (to preserve your schema changes):
- `config/settings_schema.json`

---

## Troubleshooting

### "shopify.theme.toml not found"
Create the file in your theme root directory.

### "Failed to fetch themes"
- Check your store URL is correct
- Check your password is valid
- Ensure Shopify CLI is installed: `npm install -g @shopify/cli`

### "No development themes found"
Create a development theme:
```bash
shopify theme duplicate --live --name "Development Theme"
```

---

## File Structure

```
shopify-theme-cli/
├── package.json
├── scripts/
│   ├── cli.mjs        # Main CLI entry point
│   ├── config.mjs     # Shared config and utilities
│   ├── dev.mjs        # Dev command
│   ├── push.mjs       # Push command
│   └── list.mjs       # List command
└── docs/
    └── DISTRIBUTION.md
```
