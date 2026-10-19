#!/usr/bin/env node

import chalk from 'chalk';

const command = process.argv[2];

function showHelp() {
  console.log('');
  console.log(chalk.bold('  Shopify Theme CLI - Safe Development Workflow'));
  console.log('');
  console.log(chalk.gray('  Usage:'));
  console.log('    theme-cli <command>');
  console.log('');
  console.log(chalk.gray('  Commands:'));
  console.log(`    ${chalk.cyan('dev')}     Start development server (syncs content from live first)`);
  console.log(`    ${chalk.cyan('new')}     Optionally duplicate live as a new theme, then dev on it`);
  console.log(`    ${chalk.cyan('push')}    Push theme to store (with safety checks)`);
  console.log(`    ${chalk.cyan('list')}    List all themes in store`);
  console.log(`    ${chalk.cyan('help')}    Show this help message`);
  console.log('');
  console.log(chalk.gray('  Examples:'));
  console.log('    theme-cli dev');
  console.log('    theme-cli push');
  console.log('    theme-cli list');
  console.log('');
  console.log(chalk.gray('  Requirements:'));
  console.log('    - shopify.theme.toml in current directory');
  console.log('    - Shopify CLI installed (shopify theme commands)');
  console.log('');
}

async function run() {
  switch (command) {
    case 'dev':
      await (await import('./dev.mjs')).main();
      break;
    case 'new':
      await (await import('./new.mjs')).main();
      break;
    case 'push':
      await import('./push.mjs');
      break;
    case 'list':
      await import('./list.mjs');
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      showHelp();
      break;
    default:
      console.log('');
      console.log(chalk.red(`  Unknown command: ${command}`));
      showHelp();
      process.exit(1);
  }
}

run().catch(err => {
  if (err.name === 'ExitPromptError') process.exit(0);
  console.log(chalk.red('  Error: ') + err.message);
  process.exit(1);
});
