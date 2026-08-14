/**
 * Standalone entry at http://localhost:5022, driving the same
 * `mount(el, props)` contract the Shell uses.
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
            <h1>app2 without a Shell, React 19</h1>
          </div>
          <span class="pill pill-warn">local session store</span>
        </div>
        <div id="mount-point"></div>
      </section>
    </main>
  </div>
`;

const standaloneStore = createSessionStore();
standaloneStore.addToSelection('BR-2210');
standaloneStore.addToSelection('CP-0031');

mount(document.getElementById('mount-point') as HTMLElement, {
  store: standaloneStore,
  bus,
  host: 'standalone',
});
