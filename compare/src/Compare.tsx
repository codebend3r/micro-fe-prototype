/**
 * The comparison harness.
 *
 * It runs both complete micro frontend systems at once in two iframes, drives
 * them in lockstep over postMessage so they are always showing the same
 * screen, and collects the probe readings each Shell streams back so the
 * differences can be read off one table instead of two tabs.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatBytes } from '@mfe/shared-core';

type Telemetry = {
  apps: {
    app: string;
    label: string;
    role: string;
    reactVersion: string;
    reactId: string;
    contextConnected?: boolean;
    channel?: string;
  }[];
  reactInstances: { id: string; apps: string[]; version: string | null }[];
  sessionInstances: { id: string; apps: string[] }[];
  coreInstances: { id: string; apps: string[] }[];
  scripts: { chunks: number; bytes: number };
  route: string;
  theme: string;
  selectedItems: number;
};

// Injected by compare/vite.config.ts, because the two Shells sit on their own
// origins locally and on their own paths once deployed.
const SHELLS = [
  {
    option: 1 as const,
    address: __SHELL_ONE__,
    title: 'Shared React singleton',
    subtitle: 'shell + app1 + app2 on one React 19',
  },
  {
    option: 2 as const,
    address: __SHELL_TWO__,
    title: 'Independent React versions',
    subtitle: 'app1 on React 18, app2 on React 19',
  },
];

const ROUTES = [
  { path: '/overview', label: 'Overview' },
  { path: '/catalog', label: 'Catalog' },
  { path: '/selection', label: 'Selection' },
];

const STATIC_ROWS: [string, string, string][] = [
  ['Integration unit', 'React component', 'mount(el, props) function'],
  ['Routing', 'One shared router instance', 'Shell router plus per app sub routing'],
  ['Cross app communication', 'Props, context, shared store', 'Props at mount, events, vanilla store'],
  ['Team autonomy', 'Coordinated upgrades', 'Fully independent upgrades'],
  ['Coupling', 'Higher, implicit shared deps', 'Low, explicit contract'],
  ['Failure isolation', 'A version mismatch can break everything', 'Faults contained per app'],
  ['Complexity', 'Lower', 'Higher'],
  ['Best for', 'One org, aligned stack, perf sensitive', 'Migrations, mixed stacks, many teams'],
];

export function Compare() {
  const frames = useRef<Record<number, HTMLIFrameElement | null>>({});
  const [telemetry, setTelemetry] = useState<Record<number, Telemetry | undefined>>({});
  const [route, setRoute] = useState('/overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const send = useCallback((message: Record<string, unknown>) => {
    for (const shell of SHELLS) {
      frames.current[shell.option]?.contentWindow?.postMessage(
        { source: 'mfe-compare', ...message },
        '*',
      );
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'mfe-shell') return;

      if (data.kind === 'telemetry') {
        setTelemetry((current) => ({ ...current, [data.option]: data.payload }));
      }

      if (data.kind === 'ready') {
        // A Shell just booted or reloaded. Put it back in step with the other.
        (event.source as Window | null)?.postMessage(
          { source: 'mfe-compare', kind: 'navigate', path: route },
          '*',
        );
        (event.source as Window | null)?.postMessage(
          { source: 'mfe-compare', kind: 'theme', theme },
          '*',
        );
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [route, theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const go = (path: string) => {
    setRoute(path);
    send({ kind: 'navigate', path });
  };

  const switchTheme = (next: 'dark' | 'light') => {
    setTheme(next);
    send({ kind: 'theme', theme: next });
  };

  const warmUp = () => {
    go('/catalog');
    window.setTimeout(() => go('/selection'), 1400);
  };

  const one = telemetry[1];
  const two = telemetry[2];

  return (
    <div className="compare">
      <header className="compare-header">
        <div className="compare-title">
          <span className="eyebrow">Micro frontend architecture with Vite</span>
          <h1>Two integration strategies, running at the same time</h1>
          <span className="small muted">
            Both systems are a Shell plus two independently built and deployed remotes, loaded at
            runtime over Module Federation. Everything below is live, not a mockup.
          </span>
        </div>

        <div className="controls">
          <div className="control-group">
            <span className="eyebrow">Drive both</span>
            <div className="control-buttons">
              {ROUTES.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="nav-link"
                  aria-current={route === item.path}
                  onClick={() => go(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="eyebrow">Theme</span>
            <div className="control-buttons">
              <button
                type="button"
                className="nav-link"
                aria-current={theme === 'dark'}
                onClick={() => switchTheme('dark')}
              >
                Dark
              </button>
              <button
                type="button"
                className="nav-link"
                aria-current={theme === 'light'}
                onClick={() => switchTheme('light')}
              >
                Light
              </button>
            </div>
          </div>

          <div className="control-group">
            <span className="eyebrow">Actions</span>
            <div className="control-buttons">
              <button type="button" className="btn btn-sm btn-primary" onClick={warmUp}>
                Load every remote
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => send({ kind: 'selection:add', sku: 'DR-7788' })}
              >
                Write shared state
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => send({ kind: 'selection:clear' })}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => send({ kind: 'reload' })}
              >
                Reload both
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="panel matrix-panel">
        <div className="panel-head">
          <div className="panel-title">
            <span className="eyebrow">Measured live</span>
            <h2>What the two runtimes actually differ on</h2>
          </div>
          <span className="small muted">
            Click Load every remote first, so both systems have fetched all of their code.
          </span>
        </div>

        <table className="matrix">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Option 1, shared singleton</th>
              <th>Option 2, independent versions</th>
            </tr>
          </thead>
          <tbody>
            <Row
              label="React copies on the page"
              one={one && String(one.reactInstances.length)}
              two={two && String(two.reactInstances.length)}
            />
            <Row
              label="React versions"
              one={one && versionsOf(one)}
              two={two && versionsOf(two)}
            />
            <Row
              label="Apps loaded so far"
              one={one && one.apps.map((app) => app.app).join(', ')}
              two={two && two.apps.map((app) => app.app).join(', ')}
            />
            <Row
              label="How remotes reach shell state"
              one={one && channelsOf(one)}
              two={two && channelsOf(two)}
            />
            <Row
              label="@mfe/session copies"
              one={one && String(one.sessionInstances.length)}
              two={two && String(two.sessionInstances.length)}
            />
            <Row
              label="@mfe/shared-core copies"
              one={one && String(one.coreInstances.length)}
              two={two && String(two.coreInstances.length)}
            />
            <Row
              label="JavaScript transferred"
              one={one && formatBytes(one.scripts.bytes)}
              two={two && formatBytes(two.scripts.bytes)}
            />
            <Row
              label="JavaScript chunks"
              one={one && String(one.scripts.chunks)}
              two={two && String(two.scripts.chunks)}
            />
            <Row
              label="Items in the shared session"
              one={one && String(one.selectedItems)}
              two={two && String(two.selectedItems)}
            />
          </tbody>
        </table>
      </section>

      <div className="frames">
        {SHELLS.map((shell) => (
          <section className="frame" data-option={shell.option} key={shell.option}>
            <header className="frame-head">
              <span className="frame-badge">{shell.option}</span>
              <span className="frame-title">
                <strong>
                  Option {shell.option}: {shell.title}
                </strong>
                <span className="small muted">{shell.subtitle}</span>
              </span>
              <a className="small mono" href={shell.address.url} target="_blank" rel="noreferrer">
                {shell.address.label}
              </a>
            </header>
            <iframe
              title={`Option ${shell.option}`}
              src={shell.address.url}
              ref={(node) => {
                frames.current[shell.option] = node;
              }}
            />
          </section>
        ))}
      </div>

      <section className="panel matrix-panel">
        <div className="panel-title">
          <span className="eyebrow">By design</span>
          <h2>The decisions behind those numbers</h2>
        </div>

        <table className="matrix">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Option 1, shared singleton</th>
              <th>Option 2, independent versions</th>
            </tr>
          </thead>
          <tbody>
            {STATIC_ROWS.map(([label, first, second]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="plain">{first}</td>
                <td className="plain">{second}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="note">
          <strong>Recommendation</strong>
          <span>
            Start with Option 1 if all apps are owned by one org with an aligned stack. It is
            simpler, faster and lighter. Choose Option 2 when the version split is the point:
            incremental React upgrades, acquisitions with different stacks, or large orgs where
            teams must ship without coordinating dependencies. The two are not mutually exclusive.
            Designing the mount function contract from day one while still sharing React as a
            singleton lets you un share React later without rewriting the integration layer.
          </span>
        </div>
      </section>
    </div>
  );
}

function Row({ label, one, two }: { label: string; one?: string; two?: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="o1">{one ?? <span className="waiting">waiting for shell</span>}</td>
      <td className="o2">{two ?? <span className="waiting">waiting for shell</span>}</td>
    </tr>
  );
}

function versionsOf(telemetry: Telemetry) {
  return [...new Set(telemetry.apps.map((app) => app.reactVersion))].join(' + ');
}

function channelsOf(telemetry: Telemetry) {
  const remotes = telemetry.apps.filter((app) => app.role === 'remote');
  if (remotes.length === 0) return 'no remote loaded yet';
  return [
    ...new Set(
      remotes.map((app) => (app.contextConnected ? 'react context' : (app.channel ?? 'none'))),
    ),
  ].join(', ');
}
