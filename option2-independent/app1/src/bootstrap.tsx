/**
 * Standalone entry at http://localhost:5021. It drives the exact same
 * `mount(el, props)` contract the Shell uses, which is a good way to keep the
 * contract honest.
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
            <h1>app1 without a Shell, React 18</h1>
          </div>
          <span class="pill pill-warn">local session store</span>
        </div>
        <div id="mount-point"></div>
      </section>
    </main>
  </div>
`;

mount(document.getElementById('mount-point') as HTMLElement, {
  store: createSessionStore(),
  bus,
  host: 'standalone',
});
