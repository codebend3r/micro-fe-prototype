/**
 * Standalone entry at http://localhost:5101. It drives the exact same
 * `mount(el, props)` contract world uses, which is a good way to keep the
 * contract honest. World never loads this file; it loads './mount'.
 */
import '@mfe/ui/styles.css';
import { bus, createSessionStore } from '@mfe/shared-core';
import { mount } from './mount';

const root = document.getElementById('root') as HTMLElement;
root.className = 'shell';
root.innerHTML = `
  <div class="shell-body">
    <main class="stack">
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="eyebrow">standalone</span>
            <h1>rick without world</h1>
          </div>
          <span class="pill pill-warn">local session store</span>
        </div>
        <div id="mount-point"></div>
      </section>
    </main>
  </div>
`;

// Locally this page is served at the root of its own origin, so the base is
// empty. Deployed, it sits under a path prefix, and the routes sit under it.
const base = new URL(import.meta.env.BASE_URL, window.location.href).pathname.replace(/\/$/, '');

mount(document.getElementById('mount-point') as HTMLElement, {
  store: createSessionStore(),
  bus,
  base,
});
