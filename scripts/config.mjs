// Shared configuration for Shopify theme CLI
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

// Files to sync from live theme (content only, not schema)
export const CONTENT_FILES = [
  'config/settings_data.json',
  'locales/*',
  'templates/*.json',
  'templates/**/*.json'
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

/**
 * Load store configuration from shopify.theme.toml
 * Looks in current working directory
 */
export function loadConfig() {
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
    console.log(chalk.cyan('  password = "shptka_xxxxx"'));
    console.log('');
    process.exit(1);
  }

  const content = readFileSync(tomlPath, 'utf-8');
  const config = parseToml(content);

  // Get first environment (usually env1)
  const envName = Object.keys(config)[0];
  if (!envName) {
    console.log(chalk.red('  ✗ No environment found in shopify.theme.toml'));
    process.exit(1);
  }

  const env = config[envName];

  if (!env.store || !env.password) {
    console.log(chalk.red('  ✗ Missing store or password in shopify.theme.toml'));
    process.exit(1);
  }

  return {
    store: env.store,
    password: env.password,
    environment: envName
  };
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
