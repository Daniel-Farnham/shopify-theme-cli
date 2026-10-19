// Shopify CLI wrappers shared across commands
import net from 'net';
import { execa } from 'execa';
import { authArgs, captureOptions } from './config.mjs';
import { excludeFromGit, updateSession } from './session.mjs';

// Dev server output is mirrored here so other tools (e.g. Claude) can read it
export const DEV_LOG_FILE = '.theme-dev.log';

// Admin API scopes requested by `shopify store auth` (write_* implies read_*)
export const ADMIN_SCOPES = [
  'write_products',
  'write_inventory',
  'write_publications',
  'write_purchase_options',
  'write_discounts',
  'write_content',
  'write_files',
  'write_metaobjects',
  'write_metaobject_definitions',
  'read_orders',
  'read_customers',
  'read_themes'
];

export async function getThemes(store, password) {
  const { stdout } = await execa('shopify', [
    'theme', 'list',
    '--store', store,
    ...authArgs(password),
    '--json'
  ], captureOptions(password));
  return JSON.parse(stdout);
}

/**
 * Duplicate a remote theme. Returns the new theme ({ id, name, role }).
 */
export async function duplicateTheme(store, password, sourceThemeId, name) {
  const { stdout } = await execa('shopify', [
    'theme', 'duplicate',
    '--store', store,
    ...authArgs(password),
    '--theme', sourceThemeId.toString(),
    '--name', name,
    '--force',
    '--json'
  ], captureOptions(password));
  const result = JSON.parse(stdout);
  return result.theme ?? result;
}

/**
 * `shopify store` commands need the full myshopify.com domain.
 */
export function storeDomain(store) {
  const host = store.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return host.endsWith('.myshopify.com') ? host : `${host}.myshopify.com`;
}

// Checked once per run, so chained commands (new → dev) don't re-check
const authedStores = new Set();

/**
 * Make sure `shopify store execute` works for this store (Admin API access
 * for Claude etc.). Runs a tiny query; on failure, opens browser auth.
 */
export async function ensureStoreAuth(store) {
  const domain = storeDomain(store);
  if (authedStores.has(domain)) return true;

  const probe = await execa('shopify', [
    'store', 'execute',
    '--store', domain,
    '--query', '{ shop { name } }',
    '--no-input'
  ], { reject: false });

  if (probe.exitCode !== 0) {
    const auth = await execa('shopify', [
      'store', 'auth',
      '--store', domain,
      '--scopes', ADMIN_SCOPES.join(',')
    ], { stdio: 'inherit', reject: false });
    if (auth.exitCode !== 0) return false;
  }

  authedStores.add(domain);
  return true;
}

/**
 * Start of a dev/new run: record store + environment in the session file and
 * make sure Admin API access is set up. Returns false if auth failed.
 */
export async function beginSession({ store, environment }) {
  updateSession({ store: storeDomain(store), environment }, { reset: true });
  const authed = await ensureStoreAuth(store);
  updateSession({ adminApi: authed });
  return authed;
}

const DEFAULT_DEV_PORT = 9292;

function isPortFree(port) {
  return new Promise(resolve => {
    const server = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => server.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
}

/**
 * First free port from 9292 upward, so several dev servers can run at once.
 */
export async function findFreePort(start = DEFAULT_DEV_PORT) {
  let port = start;
  while (!(await isPortFree(port))) port++;
  return port;
}

/**
 * Start `shopify theme dev` on the next free port, mirroring output to DEV_LOG_FILE
 * and recording theme/port in the session file.
 * Uses macOS `script` so the dev server keeps a real TTY (hotkeys, colours).
 */
export async function startLoggedDevServer(store, password, theme) {
  excludeFromGit(DEV_LOG_FILE);
  const port = await findFreePort();
  updateSession({
    theme: { id: theme.id, name: theme.name },
    previewUrl: `http://127.0.0.1:${port}`,
    devLog: DEV_LOG_FILE
  });
  await execa('script', [
    '-q', DEV_LOG_FILE,
    'shopify', 'theme', 'dev',
    '--store', store,
    ...authArgs(password),
    '--theme', theme.id.toString(),
    '--port', port.toString()
  ], { stdio: 'inherit' });
}
