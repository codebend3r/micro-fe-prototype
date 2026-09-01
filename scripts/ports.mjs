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
 *   bun scripts/ports.mjs free               kill this repo's dev servers
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

const APPS = [
  { port: 5100, label: 'world (shell)', dir: 'world' },
  { port: 5101, label: 'rick', dir: 'rick' },
  { port: 5102, label: 'morty', dir: 'morty' },
];

const [mode, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((arg) => arg.startsWith('--')));
const targets = APPS;

/** True only if nothing is listening on either loopback stack. */
function isFree(port) {
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

function listenersOn(port) {
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

async function check() {
  const busy = [];

  for (const target of targets) {
    if (!(await isFree(target.port))) {
      busy.push({ ...target, holders: listenersOn(target.port) });
    }
    if (flags.has('--built')) {
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
    console.error('  A previous run is still going. Free the ports with:\n');
    console.error('      bun run stop\n');
  }
  if (foreign) {
    console.error('  Something outside this repo holds a port. On macOS, System Settings >');
    console.error('  General > AirDrop & Handoff > AirPlay Receiver takes 5000 and 7000.\n');
  }
  process.exit(1);
}

function free() {
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

if (mode === 'check') await check();
else if (mode === 'free') free();
else {
  console.error('Usage: bun scripts/ports.mjs <check|free> [--built]');
  process.exit(2);
}
