// Shared configuration for Shopify theme CLI
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';

// Files to sync from live theme (content only, not schema)
export const CONTENT_FILES = [
  'config/settings_data.json',
  'locales/*',
  'templates/*.json',
  'templates/**/*.json',
  // Section groups (e.g. header-group.json, footer-group.json) — merchant
  // content edited via the theme editor, not theme code.
  'sections/*.json'
];

// Files to explicitly exclude from sync
export const EXCLUDE_FILES = [
  'config/settings_schema.json'
];

/**
 * Parse shopify.theme.toml file
 * Supports basic TOML format used by Shopify CLI
 */
function parseToml(content) {
  const config = {};
  let currentSection = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Section header [environments.name]
    const sectionMatch = trimmed.match(/^\[environments\.(\w+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      config[currentSection] = {};
      continue;
    }

    // Key = value pairs
    if (currentSection) {
      const kvMatch = trimmed.match(/^(\w+)\s*=\s*"?([^"]*)"?$/);
      if (kvMatch) {
        config[currentSection][kvMatch[1]] = kvMatch[2];
      }
    }
  }

  return config;
}

// Chosen once per run, so chained commands (new → dev) don't ask twice
let cachedConfig = null;

/**
 * Load store configuration from shopify.theme.toml
 * Looks in current working directory. Asks which environment to use
 * when the file defines more than one.
 */
export async function loadConfig() {
  if (cachedConfig) return cachedConfig;

  const tomlPath = join(process.cwd(), 'shopify.theme.toml');

  if (!existsSync(tomlPath)) {
    console.log('');
    console.log(chalk.red('  ✗ shopify.theme.toml not found!'));
    console.log('');
    console.log(chalk.gray('  This file should be in your theme root directory.'));
    console.log(chalk.gray('  Create it with the following format:'));
    console.log('');
    console.log(chalk.cyan('  [environments.env1]'));
    console.log(chalk.cyan('  store = "your-store.myshopify.com"'));
    console.log(chalk.cyan('  password = "shptka_xxxxx"  # optional — omit to use browser login'));
    console.log('');
    process.exit(1);
  }

  const content = readFileSync(tomlPath, 'utf-8');
  const config = parseToml(content);

  const envNames = Object.keys(config);
  if (envNames.length === 0) {
    console.log(chalk.red('  ✗ No environment found in shopify.theme.toml'));
    process.exit(1);
  }

  const envName = envNames.length === 1 ? envNames[0] : await select({
    message: chalk.cyan('Which environment?'),
    choices: envNames.map(name => ({
      name: `${name} ${chalk.gray(`(${config[name].store || 'no store'})`)}`,
      value: name
    }))
  });

  const env = config[envName];

  if (!env.store) {
    console.log(chalk.red('  ✗ Missing store in shopify.theme.toml'));
    process.exit(1);
  }

  cachedConfig = {
    store: env.store,
    password: env.password || null,
    environment: envName
  };
  return cachedConfig;
}

/**
 * Auth flags for `shopify theme` commands.
 * With no password configured, the Shopify CLI falls back to browser
 * session auth (requires staff/collaborator access on the store).
 */
export function authArgs(password) {
  return password ? ['--password', password] : [];
}

/**
 * Execa options for `shopify` calls whose stdout is captured (--json).
 * Session auth prompts for browser login on stderr/stdin — keep those
 * attached so the prompt is visible and answerable.
 */
export function captureOptions(password) {
  return password ? {} : { stdio: ['inherit', 'pipe', 'inherit'] };
}

/**
 * Sort themes by ID descending (newest first)
 * Live theme always at top
 */
export function sortThemes(themes) {
  return [...themes].sort((a, b) => {
    // Live theme always first
    if (a.role === 'live') return -1;
    if (b.role === 'live') return 1;
    // Then sort by ID descending (newest first)
    return b.id - a.id;
  });
}
