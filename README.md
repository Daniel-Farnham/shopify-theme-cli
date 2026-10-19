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
npx github:Daniel-Farnham/shopify-theme-cli dev
```

### Install globally

```bash
npm install -g github:Daniel-Farnham/shopify-theme-cli
theme-cli dev
```

## Setup

1. Create `shopify.theme.toml` in your theme root:

```toml
[environments.env1]
store = "your-store.myshopify.com"
password = "shptka_xxxxx"  # optional — omit to use browser login
```

`password` is a [Theme Access](https://shopify.dev/docs/storefronts/themes/tools/theme-access) password. If omitted, the Shopify CLI falls back to browser session auth — your Shopify account must be staff or a collaborator on the store. Run `shopify auth logout` first to switch accounts.

2. Run commands:

```bash
theme-cli new    # Optionally duplicate a theme, then start dev on it
theme-cli dev    # Start dev server (syncs content from live first)
theme-cli push   # Push to a dev theme
theme-cli list   # List all themes
theme-cli help   # Show help
```

## Commands

| Command | Description |
|---------|-------------|
| `new` | Start a new theme? Yes → pick a source theme → name it → duplicate → dev on it. No → `dev` flow |
| `dev` | Select dev theme → sync content from live → start dev server |
| `push` | Select dev theme → push local files (with confirmation) |
| `list` | List all themes (live first, then newest to oldest) |
| `help` | Show help message |

## Dev sessions

- **Environments** — if `shopify.theme.toml` has several environments, every command asks which one first.
- **Free port** — dev servers start on the first free port from 9292, so several can run at once.
- **`.theme-dev.log`** — dev server output is mirrored here (git-excluded) so other tools can read it.
- **`.shopify-session.json`** — store, environment, dev theme and preview URL for the current run (git-excluded).
- **Admin API auth** — `dev`/`new` check `shopify store execute` works for the store and run `shopify store auth` if not (requires Shopify CLI 4.x). Scopes live in `ADMIN_SCOPES` in `scripts/shopify.mjs`.

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
- Theme Access password from Shopify Admin, or staff/collaborator access for browser login

## License

MIT
