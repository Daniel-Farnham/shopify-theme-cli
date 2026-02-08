#!/usr/bin/env node

import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { loadConfig, sortThemes, CONTENT_FILES } from './config.mjs';

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

function banner(storeName) {
  console.log('');
  console.log(chalk.magenta.bold('  ╔═══════════════════════════════════════╗'));
  console.log(chalk.magenta.bold('  ║') + chalk.white.bold('   SHOPIFY THEME DEV                   ') + chalk.magenta.bold('║'));
  console.log(chalk.magenta.bold('  ║') + chalk.gray('   Safe development workflow            ') + chalk.magenta.bold('║'));
  console.log(chalk.magenta.bold('  ╚═══════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.gray(`  Store: ${storeName}`));
  console.log('');
}

function divider() {
  console.log(chalk.gray('  ─────────────────────────────────────────'));
}

function success(msg) {
  console.log(chalk.green('  ✓ ') + msg);
}

function warning(msg) {
  console.log(chalk.yellow('  ⚠ ') + msg);
}

function error(msg) {
  console.log(chalk.red('  ✗ ') + msg);
}

function info(msg) {
  console.log(chalk.blue('  ℹ ') + msg);
}

// ============================================================================
// SHOPIFY API HELPERS
// ============================================================================

async function getThemes(store, password) {
  const { stdout } = await execa('shopify', [
    'theme', 'list',
    '--store', store,
    '--password', password,
    '--json'
  ]);
  return JSON.parse(stdout);
}

async function pullContent(store, password, { live = false, themeId = null } = {}) {
  const args = [
    'theme', 'pull',
    '--store', store,
    '--password', password,
    '--nodelete'
  ];

  if (live) {
    args.push('--live');
  } else if (themeId) {
    args.push('--theme', themeId.toString());
  }

  // Add each content file pattern
  for (const pattern of CONTENT_FILES) {
    args.push('--only', pattern);
  }

  await execa('shopify', args, { stdio: 'inherit' });
}

async function startDevServer(store, password, themeId) {
  await execa('shopify', [
    'theme', 'dev',
    '--store', store,
    '--password', password,
    '--theme', themeId.toString()
  ], { stdio: 'inherit' });
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

async function main() {
  // Load config from shopify.theme.toml
  const config = loadConfig();
  const { store, password } = config;

  banner(store);

  // Step 1: Fetch all themes
  const spinner = ora({
    text: 'Fetching themes from store...',
    prefixText: '  '
  }).start();

  let themes;
  try {
    themes = await getThemes(store, password);
    spinner.succeed('Themes loaded');
  } catch (err) {
    spinner.fail('Failed to fetch themes');
    error(err.message);
    process.exit(1);
  }

  // Step 2: Identify live theme
  const liveTheme = themes.find(t => t.role === 'live');
  if (!liveTheme) {
    error('Could not identify live theme!');
    process.exit(1);
  }

  console.log('');
  divider();
  console.log(chalk.red.bold('  LIVE THEME (protected):'));
  console.log(chalk.red(`    ${liveTheme.name}`));
  console.log(chalk.red(`    ID: ${liveTheme.id}`));
  divider();
  console.log('');

  // Step 3: Filter out live theme and sort by newest first
  const devThemes = sortThemes(themes.filter(t => t.role !== 'live'));

  if (devThemes.length === 0) {
    warning('No development themes found!');
    info('Create a new theme in Shopify admin or use: shopify theme duplicate --live');
    process.exit(1);
  }

  // Step 4: Theme selection (sorted newest first)
  const choices = devThemes.map(t => ({
    name: `${t.name} ${chalk.gray(`(ID: ${t.id})`)}`,
    value: t
  }));

  const selectedTheme = await select({
    message: chalk.cyan('Select a theme to develop:'),
    choices,
    pageSize: 10
  });

  // Step 5: SAFETY CHECK - Verify selected theme is NOT live
  console.log('');
  divider();
  console.log(chalk.yellow.bold('  SAFETY VERIFICATION'));
  divider();
  console.log('');
  console.log(`  Target theme: ${chalk.cyan(selectedTheme.name)}`);
  console.log(`  Target ID:    ${chalk.cyan(selectedTheme.id)}`);
  console.log('');
  console.log(`  Live theme:   ${chalk.red(liveTheme.name)}`);
  console.log(`  Live ID:      ${chalk.red(liveTheme.id)}`);
  console.log('');

  // Programmatic safety check
  if (selectedTheme.id === liveTheme.id) {
    error('BLOCKED: Selected theme IS the live theme!');
    error('This should never happen. Aborting for safety.');
    process.exit(1);
  }

  if (selectedTheme.role === 'live') {
    error('BLOCKED: Selected theme has role "live"!');
    error('This should never happen. Aborting for safety.');
    process.exit(1);
  }

  success(`Target is ${chalk.bold('NOT')} the live theme`);
  console.log('');

  // Step 6: User confirmation
  const proceed = await confirm({
    message: chalk.cyan('Proceed with development?'),
    default: true
  });

  if (!proceed) {
    info('Aborted by user');
    process.exit(0);
  }

  // Step 7: Ask how to handle content sync
  console.log('');
  const pullOption = await select({
    message: chalk.cyan('How would you like to sync content?'),
    choices: [
      { name: `Pull from live theme ${chalk.gray(`(${liveTheme.name})`)}`, value: 'live' },
      { name: `Pull from selected theme ${chalk.gray(`(${selectedTheme.name})`)}`, value: 'theme' },
      { name: 'Skip pull (use local content)', value: 'skip' }
    ]
  });

  if (pullOption !== 'skip') {
    const isLive = pullOption === 'live';
    const sourceName = isLive ? liveTheme.name : selectedTheme.name;

    console.log('');
    divider();
    console.log(chalk.blue.bold(`  SYNCING CONTENT FROM ${isLive ? 'LIVE' : 'SELECTED'} THEME`));
    divider();
    console.log('');
    info(`Source: ${sourceName}`);
    info('Pulling: config/settings_data.json, locales/*, templates/*.json');
    console.log('');

    try {
      await pullContent(store, password, {
        live: isLive,
        themeId: isLive ? null : selectedTheme.id
      });
      console.log('');
      success(`Content synced from ${sourceName}`);
    } catch (err) {
      console.log('');
      warning('Content sync had issues (may be partial)');
      warning(err.message);
    }
  } else {
    info('Skipping content sync — using local content');
  }

  // Step 8: Start dev server
  console.log('');
  divider();
  console.log(chalk.green.bold('  STARTING DEV SERVER'));
  divider();
  console.log('');
  info(`Theme: ${selectedTheme.name} (${selectedTheme.id})`);
  info('Press Ctrl+C to stop');
  console.log('');

  try {
    await startDevServer(store, password, selectedTheme.id);
  } catch (err) {
    if (err.signal !== 'SIGINT') {
      error('Dev server error: ' + err.message);
      process.exit(1);
    }
  }

  console.log('');
  info('Dev server stopped');
}

// Run
main().catch(err => {
  console.log(chalk.red('  ✗ ') + 'Unexpected error: ' + err.message);
  process.exit(1);
});
