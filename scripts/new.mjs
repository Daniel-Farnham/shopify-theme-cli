#!/usr/bin/env node

import { existsSync } from 'fs';
import { join } from 'path';
import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, sortThemes } from './config.mjs';
import { getThemes, duplicateTheme, startLoggedDevServer, beginSession, DEV_LOG_FILE } from './shopify.mjs';
import { main as runDev } from './dev.mjs';

// Optional new-theme workflow: pick a source theme → duplicate → name it → start dev on it.
// Not a Shopify theme folder → plain shell. User says no → regular dev flow.

function info(msg) {
  console.log(chalk.blue('  ℹ ') + msg);
}

function error(msg) {
  console.log(chalk.red('  ✗ ') + msg);
}

export async function main() {
  if (!existsSync(join(process.cwd(), 'shopify.theme.toml'))) {
    info('No shopify.theme.toml here — skipping theme setup');
    return;
  }

  // Environment first: everything below targets its store
  const config = await loadConfig();
  const { store, password } = config;
  if (!(await beginSession(config))) {
    error('Admin API auth failed — Claude won\'t be able to query this store');
  }

  const startNew = await confirm({
    message: chalk.cyan('Start a new Shopify theme (duplicate of an existing one)?'),
    default: false
  });
  if (!startNew) return runDev();

  const spinner = ora({ text: 'Fetching themes...', prefixText: '  ' }).start();
  let themes;
  try {
    themes = sortThemes(await getThemes(store, password));
    spinner.succeed('Themes loaded');
  } catch (err) {
    spinner.fail('Failed to fetch themes');
    error(err.message);
    process.exit(1);
  }
  const liveTheme = themes.find(t => t.role === 'live');
  if (!liveTheme) {
    error('Could not identify live theme');
    process.exit(1);
  }

  // Live is listed first (sortThemes) and preselected
  const sourceTheme = await select({
    message: chalk.cyan('Duplicate from:'),
    choices: themes.map(t => ({
      name: `${t.name} ${chalk.gray(`(${t.role === 'live' ? 'live, ' : ''}ID: ${t.id})`)}`,
      value: t
    })),
    pageSize: 10
  });

  const name = await input({
    message: chalk.cyan('New theme name:'),
    validate: value => value.trim() ? true : 'Name is required'
  });

  spinner.start(`Duplicating ${sourceTheme.name}...`);
  let newTheme;
  try {
    newTheme = await duplicateTheme(store, password, sourceTheme.id, name.trim());
  } catch (err) {
    spinner.fail('Duplicate failed');
    error(err.message);
    process.exit(1);
  }

  // Safety: never run dev against live
  if (!newTheme?.id || newTheme.id === liveTheme.id || newTheme.role === 'live') {
    spinner.fail('Duplicate returned an unexpected theme — aborting for safety');
    process.exit(1);
  }
  spinner.succeed(`Created ${chalk.bold(newTheme.name)} ${chalk.gray(`(ID: ${newTheme.id})`)}`);

  console.log('');
  info(`Starting dev server — output mirrored to ${DEV_LOG_FILE}`);
  console.log('');

  try {
    await startLoggedDevServer(store, password, newTheme);
  } catch (err) {
    if (err.signal !== 'SIGINT') {
      error('Dev server error: ' + err.message);
      process.exit(1);
    }
  }
}

