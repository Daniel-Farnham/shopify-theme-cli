// Per-repo session file: tells other tools (e.g. Claude in a sibling pane)
// which store, theme and port this terminal is working against.
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

export const SESSION_FILE = '.shopify-session.json';

/**
 * Keep a local-only file out of git without touching the repo's .gitignore.
 */
export function excludeFromGit(fileName) {
  const infoDir = join(process.cwd(), '.git', 'info');
  if (!existsSync(infoDir)) return;
  const excludePath = join(infoDir, 'exclude');
  const current = existsSync(excludePath) ? readFileSync(excludePath, 'utf-8') : '';
  if (!current.split('\n').includes(fileName)) {
    appendFileSync(excludePath, `${current.endsWith('\n') || !current ? '' : '\n'}${fileName}\n`);
  }
}

function readSession() {
  const path = join(process.cwd(), SESSION_FILE);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Merge fields into the session file. Pass `reset: true` at the start of a run
 * so stale theme/port values from a previous session don't linger.
 */
export function updateSession(fields, { reset = false } = {}) {
  excludeFromGit(SESSION_FILE);
  const session = {
    ...(reset ? {} : readSession()),
    ...fields,
    updatedAt: new Date().toISOString()
  };
  writeFileSync(join(process.cwd(), SESSION_FILE), JSON.stringify(session, null, 2) + '\n');
}
