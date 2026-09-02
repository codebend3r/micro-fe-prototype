#!/usr/bin/env bun
/**
 * Run one app on its own.
 *
 *   bun run start:morty      build morty, then serve that build on :5102
 *   bun run dev:morty        morty on a Vite dev server with HMR
 *
 *   bun scripts/start-app.mjs <app> [--dev]
 *
 * Every app in this system is a real standalone app, which is the whole point
 * of independent deployment, so running one by itself has to be a first class
 * thing rather than a command you assemble by hand. This script does the same
 * port preflight the whole-system scripts do, but for one port instead of
 * three, and then hands off to that app's own `dev`, `build` and `preview`.
 *
 * It knows about jerry too, even though this repo never builds jerry. Jerry
 * lives in a sibling repository; all this script does is run that repo's own
 * scripts and say something useful when the repo is not there.
 */
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APPS, appsNamed, check, isFree } from './ports.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUEST_REPO = 'https://github.com/codebend3r/micro-fe-prototype--guest';

const args = process.argv.slice(2);
const name = args.find((arg) => !arg.startsWith('--'));
const dev = args.includes('--dev');

if (!name) {
  console.error('\n  Usage: bun scripts/start-app.mjs <app> [--dev]\n');
  console.error(`  Apps: ${APPS.flatMap((app) => app.names).join(', ')}\n`);
  process.exit(2);
}

const [app] = appsNamed([name]);
const dir = path.resolve(ROOT, app.dir);
const url = `http://localhost:${app.port}`;

// This repo's own apps share the workspace install at the root. Jerry does not:
// it is a separate repo with its own lockfile and its own node_modules.
if (app.guest) {
  if (!existsSync(path.join(dir, 'package.json'))) {
    console.error(`\n  jerry lives in its own repository, and it is not at ${app.dir}.\n`);
    console.error(`      git clone ${GUEST_REPO} ${app.dir}`);
    console.error(`      bun install --cwd ${app.dir}\n`);
    process.exit(1);
  }
  if (!existsSync(path.join(dir, 'node_modules'))) {
    console.error(`\n  jerry's dependencies are not installed.\n`);
    console.error(`      bun install --cwd ${app.dir}\n`);
    process.exit(1);
  }
}

// Fail on a taken port before building anything, with one clear sentence.
await check([app]);

/** Nothing listening means that app is not up. Good enough to report on. */
async function isUp(port) {
  return !(await isFree(port));
}

/**
 * What this app can and cannot reach right now. Running one app alone is
 * supposed to work, but what you see depends on who else is up, so say so
 * rather than let an empty remote slot look like a bug.
 */
async function banner(mode) {
  const lines = [];

  if (app.dir === 'world') {
    const remotes = APPS.filter((entry) => entry.dir !== 'world');
    const states = await Promise.all(
      remotes.map(async (remote) => [remote, await isUp(remote.port)]),
    );
    for (const [remote, up] of states) {
      lines.push(`  ${remote.names[0].padEnd(7)}${up ? `up on ${remote.port}` : 'not running'}`);
    }
    // Suggest one that is actually missing, not one already answering.
    const [missing] = states.find(([, up]) => !up) ?? states[0];
    lines.push('');
    lines.push('  World only reaches for a remote when you navigate to it, so a remote can');
    lines.push('  start later. Until it does, its slot reports the failure and the rest of');
    lines.push(`  the page keeps working. Start one with \`bun run start:${missing.names[0]}\`.`);
  } else {
    const world = APPS.find((entry) => entry.dir === 'world');
    lines.push(
      (await isUp(world.port))
        ? `  world is up on ${world.port} and will load this remote from here.`
        : `  world is not running. This is ${app.names[0]} by itself, on its own root.`,
    );
  }

  console.log(`\n  ${app.label} on ${url}, ${mode}\n`);
  console.log(lines.join('\n') + '\n');
}

/** Run one `bun` command against the app's directory, wired to this terminal. */
function run(...rest) {
  return new Promise((done) => {
    const child = spawn('bun', ['run', '--cwd', dir, ...rest], { cwd: ROOT, stdio: 'inherit' });
    // Ctrl+C already reaches the child through the process group; forwarding
    // covers a SIGTERM sent to this process alone.
    const forward = (signal) => child.kill(signal);
    process.on('SIGINT', forward).on('SIGTERM', forward);
    child.on('exit', (code, signal) => {
      process.off('SIGINT', forward).off('SIGTERM', forward);
      done(signal ? 0 : (code ?? 0));
    });
  });
}

if (dev) {
  await banner('dev server with HMR');
  process.exit(await run('dev'));
}

// Built output first, then serve it: the same order `bun run start` uses, and
// the only mode where bundle sizes and federation chunking mean anything.
const built = await run('build');
if (built !== 0) process.exit(built);
await banner('built and served');
process.exit(await run('preview'));
