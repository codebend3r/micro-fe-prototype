#!/usr/bin/env bun
/**
 * Preflight and cleanup for the prototype's fixed ports.
 *
 * Every app pins its port with `strictPort: true`, because world resolves its
 * remotes by absolute URL. That is the right behaviour, but it means a single
 * stale process turns `bun run start` into three confusing SIGTERM failures at
 * once. This script turns that into one clear sentence.
 *
 *   bun scripts/ports.mjs check              verify the ports are free
 *   bun scripts/ports.mjs check --built      also verify each dist/ exists
 *   bun scripts/ports.mjs check morty        one app instead of all of them
 *   bun scripts/ports.mjs free               kill this repo's dev servers
 *
 * `scripts/start-app.mjs` imports the checks from here rather than shelling
 * out, so one app and all of them get the same preflight and the same wording.
 */
import net from 'node:net';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Processes this repo is allowed to recognise as its own, and therefore to
 * kill. `bun run` hands a `#!/usr/bin/env node` bin like Vite's to Node, so a
 * dev server shows up as `node`; `bun run --bun` keeps it in Bun's runtime and
 * it shows up as `bun`. Anything else is somebody else's server.
 */
const OURS = /^(node|bun)$/i;

export const APPS = [
  { port: 5100, label: 'world (shell)', dir: 'world', names: ['world', 'shell'] },
  { port: 5101, label: 'rick', dir: 'rick', names: ['rick'] },
  { port: 5102, label: 'morty', dir: 'morty', names: ['morty'] },
  // Jerry is a guest from another repository, so it is opt in: named on the
  // command line or not touched at all. Bare `check` and `free` stay about the
  // three ports this repo actually builds and serves.
  {
    port: 5103,
    label: 'jerry (guest)',
    dir: '../micro-fe-prototype--guest',
    names: ['jerry', 'guest'],
    guest: true,
  },
];

/** The three apps this repo owns. What the whole-system scripts operate on. */
export const OURS_TO_RUN = APPS.filter((app) => !app.guest);

/** Turn names like `morty` or `shell` into app entries. Exits if one is wrong. */
export function appsNamed(names) {
  return names.map((name) => {
    const app = APPS.find((entry) => entry.names.includes(name.toLowerCase()));
    if (app) return app;
    const known = APPS.flatMap((entry) => entry.names).join(', ');
    console.error(`\n  Unknown app: ${name}\n\n  Try one of: ${known}\n`);
    process.exit(2);
  });
}

/** True only if nothing is listening on either loopback stack. */
export function isFree(port) {
  return Promise.all(['127.0.0.1', '::1'].map((host) => canBind(port, host))).then((results) =>
    results.every(Boolean),
  );
}

function canBind(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    try {
      server.listen({ port, host, exclusive: true });
    } catch {
      resolve(false);
    }
  });
}

export function listenersOn(port) {
  let output = '';
  try {
    output = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return [];
  }

  const found = [];
  let pid = null;
  for (const line of output.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    if (line.startsWith('c') && pid) found.push({ pid, command: line.slice(1) });
  }
  return found;
}

export async function check(targets, { built = false } = {}) {
  const busy = [];

  for (const target of targets) {
    if (!(await isFree(target.port))) {
      busy.push({ ...target, holders: listenersOn(target.port) });
    }
    if (built) {
      const built = path.join(ROOT, target.dir, 'dist', 'index.html');
      if (!existsSync(built)) {
        console.error(
          `\n  ${target.dir} has not been built yet.` +
            `\n  \`bun run serve\` only serves existing output. Run \`bun run start\` instead.\n`,
        );
        process.exit(1);
      }
    }
  }

  if (busy.length === 0) return;

  console.error('\n  Cannot start: these ports are already taken.\n');
  for (const entry of busy) {
    const holders = entry.holders.length
      ? entry.holders.map((h) => `${h.command} (pid ${h.pid})`).join(', ')
      : 'unknown process';
    console.error(`    ${entry.port}  ${entry.label.padEnd(20)} held by ${holders}`);
  }

  const ours = busy.some((entry) => entry.holders.some((h) => OURS.test(h.command)));
  const foreign = busy.some((entry) => entry.holders.some((h) => !OURS.test(h.command)));

  console.error('');
  if (ours) {
    // `bun run stop` only frees this repo's three. Jerry has to be named.
    const stop = busy.every((entry) => entry.guest) ? 'bun run stop jerry' : 'bun run stop';
    console.error('  A previous run is still going. Free the ports with:\n');
    console.error(`      ${stop}\n`);
  }
  if (foreign) {
    console.error('  Something outside this repo holds a port. On macOS, System Settings >');
    console.error('  General > AirDrop & Handoff > AirPlay Receiver takes 5000 and 7000.\n');
  }
  process.exit(1);
}

export function free(targets) {
  let killed = 0;

  for (const target of targets) {
    for (const holder of listenersOn(target.port)) {
      // Only ever kill this prototype's own dev servers.
      if (!OURS.test(holder.command)) {
        console.log(`  ${target.port}  left alone, held by ${holder.command} (pid ${holder.pid})`);
        continue;
      }
      try {
        process.kill(holder.pid, 'SIGTERM');
        console.log(`  ${target.port}  stopped ${holder.command} (pid ${holder.pid})`);
        killed += 1;
      } catch (cause) {
        console.log(`  ${target.port}  could not stop pid ${holder.pid}: ${cause.message}`);
      }
    }
  }

  console.log(killed ? `\n  Stopped ${killed} process(es).\n` : '\n  Nothing to stop.\n');
}

if (import.meta.main) {
  const [mode, ...rest] = process.argv.slice(2);
  const flags = new Set(rest.filter((arg) => arg.startsWith('--')));
  const named = rest.filter((arg) => !arg.startsWith('--'));
  const targets = named.length ? appsNamed(named) : OURS_TO_RUN;

  if (mode === 'check') await check(targets, { built: flags.has('--built') });
  else if (mode === 'free') free(targets);
  else {
    console.error('Usage: bun scripts/ports.mjs <check|free> [app...] [--built]');
    process.exit(2);
  }
}
