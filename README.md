# Shopify Theme CLI

Safe Shopify theme development workflow with live theme protection.

## Features

- **Live theme protection** - Cannot accidentally push to live theme
- **Content syncing** - Pulls latest content (settings, locales, templates) from live
- **Interactive UI** - Beautiful terminal interface for theme selection
- **Safety verification** - Multiple checks before any operation

## Quick Start

### Via npx (no install)

```bash
npx github:YOUR_USERNAME/shopify-theme-cli dev
```

### Install globally

```bash
npm install -g github:YOUR_USERNAME/shopify-theme-cli
theme-cli dev
```

## Setup

1. Create `shopify.theme.toml` in your theme root:

```toml
[environments.env1]
store = "your-store.myshopify.com"
password = "shptka_xxxxx"
```

2. Run commands:

```bash
theme-cli dev    # Start dev server (syncs content from live first)
theme-cli push   # Push to a dev theme
theme-cli list   # List all themes
theme-cli help   # Show help
```

## Commands

| Command | Description |
|---------|-------------|
| `dev` | Select dev theme → sync content from live → start dev server |
| `push` | Select dev theme → push local files (with confirmation) |
| `list` | List all themes (live first, then newest to oldest) |
| `help` | Show help message |

## Safety Features

1. **Auto-detects live theme** - Fetched fresh from API each time
2. **Live excluded from selection** - Can't even pick it
3. **ID verification** - Programmatically verifies selected ≠ live
4. **Role verification** - Double-checks theme role isn't "live"
5. **Visual confirmation** - Shows both theme IDs before proceeding
6. **User confirmation** - Must confirm before dev/push operations

## Content Sync

When running `dev`, these files are synced from live:

- `config/settings_data.json`
- `locales/*`
- `templates/*.json`
- `templates/**/*.json`

**Not synced** (preserves your schema changes):
- `config/settings_schema.json`

## Requirements

- Node.js >= 18
- Shopify CLI installed (`npm install -g @shopify/cli`)
- Theme Access password from Shopify Admin

## License

MIT
