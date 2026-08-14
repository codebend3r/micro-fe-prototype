/**
 * Standalone entry, so the team that owns app1 can run and test it on its own
 * at http://localhost:5011 without the Shell. The Shell never loads this file;
 * it loads the exposed './App' module instead.
 */
import { createRoot } from 'react-dom/client';
import '@mfe/ui/styles.css';
import { createSessionStore } from '@mfe/shared-core';
import { SessionProvider } from '@mfe/session';
import App from './App';

const standaloneStore = createSessionStore();

createRoot(document.getElementById('root') as HTMLElement).render(
  <SessionProvider store={standaloneStore}>
    <div className="shell">
      <div className="shell-body">
        <main className="stack">
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <span className="eyebrow">standalone</span>
                <h1>app1 without a Shell</h1>
              </div>
              <span className="pill pill-warn">local session store</span>
            </div>
            <App />
          </section>
        </main>
      </div>
    </div>
  </SessionProvider>,
);
