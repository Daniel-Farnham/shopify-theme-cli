#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { loadConfig, sortThemes } from './config.mjs';

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

function banner(storeName) {
  console.log('');
  console.log(chalk.gray.bold('  ╔═══════════════════════════════════════╗'));
  console.log(chalk.gray.bold('  ║') + chalk.white.bold('   SHOPIFY THEME LIST                  ') + chalk.gray.bold('║'));
  console.log(chalk.gray.bold('  ╚═══════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.gray(`  Store: ${storeName}`));
  console.log('');
}

function divider() {
  console.log(chalk.gray('  ─────────────────────────────────────────'));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Load config from shopify.theme.toml
  const config = loadConfig();
  const { store, password } = config;

  banner(store);

  const spinner = ora({
    text: 'Fetching themes...',
    prefixText: '  '
  }).start();

  let themes;
  try {
    const { stdout } = await execa('shopify', [
      'theme', 'list',
      '--store', store,
      '--password', password,
      '--json'
    ]);
    themes = JSON.parse(stdout);
    spinner.succeed('Themes loaded');
  } catch (err) {
    spinner.fail('Failed to fetch themes');
    console.log(chalk.red('  ✗ ') + err.message);
    process.exit(1);
  }

  console.log('');
  divider();

  // Sort: live first, then newest to oldest by ID
  const sortedThemes = sortThemes(themes);

  for (const theme of sortedThemes) {
    const isLive = theme.role === 'live';
    const roleTag = isLive
      ? chalk.red.bold(' [LIVE] ')
      : chalk.gray(` [${theme.role}] `);

    const name = isLive
      ? chalk.red.bold(theme.name)
      : chalk.white(theme.name);

    const id = chalk.gray(`ID: ${theme.id}`);

    console.log(`  ${roleTag}${name}`);
    console.log(`           ${id}`);
    console.log('');
  }

  divider();
  console.log(`  ${chalk.gray('Total:')} ${themes.length} themes`);
  console.log(`  ${chalk.gray('Sorted:')} Live first, then newest to oldest`);
  console.log('');
}

main().catch(err => {
  console.log(chalk.red('  ✗ Unexpected error: ') + err.message);
  process.exit(1);
});
