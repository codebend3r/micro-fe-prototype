/**
 * The instrumentation panel world shows beside the remotes: which apps have
 * loaded so far, how many React copies that cost, and how much JavaScript
 * came over the wire. Watching it fill in as you click Rick and Morty is the
 * lazy loading, made visible.
 */
import { formatBytes } from '@mfe/shared-core';

function Stat({ value, label, tone }) {
  return (
    <div className="stat">
      <div className="stat-value" data-tone={tone}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function ProbePanel({ snapshot, scripts, prod, events, location }) {
  const reactCount = snapshot.reactInstances.length;
  const versions = [...new Set(snapshot.reactInstances.map((instance) => instance.version))];

  return (
    <aside className="probe">
      <div className="panel-head">
        <div className="panel-title">
          <span className="eyebrow">Federation probe</span>
          <h2>Runtime facts</h2>
        </div>
        <span className={`pill ${prod ? 'pill-ok' : 'pill-warn'}`}>
          <span className="dot" />
          {prod ? 'built bundles' : 'dev server'}
        </span>
      </div>

      <div className="probe-stats">
        <Stat value={reactCount} label="React copies" tone="accent" />
        <Stat value={versions.join(' + ') || '?'} label="React versions" />
        <Stat value={formatBytes(scripts.bytes)} label="JS transferred" />
        <Stat value={scripts.chunks} label="JS chunks" />
      </div>

      <dl className="kv">
        <dt>Browser URL</dt>
        <dd>{location}</dd>
      </dl>

      <div className="stack" style={{ gap: '8px' }}>
        <span className="eyebrow">Apps on this page</span>
        <table className="table">
          <thead>
            <tr>
              <th>App</th>
              <th className="mono">React</th>
              <th>Sees</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.apps.map((app) => (
              <tr key={app.app}>
                <td>
                  <strong>{app.app}</strong>
                  <br />
                  <span className="small muted">{app.label}</span>
                </td>
                <td className="mono">
                  {app.reactVersion}
                  <br />
                  <span className="muted">{app.reactId}</span>
                </td>
                <td className="mono small">
                  {app.role === 'shell' ? (
                    <span className="pill pill-accent">owner</span>
                  ) : (
                    <>
                      {app.location ?? '/'}
                      <br />
                      <span className="muted">theme {app.themeSeen ?? '?'}</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scripts.byOrigin.length > 0 ? (
        <div className="stack" style={{ gap: '8px' }}>
          <span className="eyebrow">JavaScript by origin</span>
          <table className="table">
            <tbody>
              {scripts.byOrigin.map((row) => (
                <tr key={row.origin}>
                  <td className="mono">{row.origin}</td>
                  <td className="num mono">{row.chunks}</td>
                  <td className="num mono">{formatBytes(row.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="stack" style={{ gap: '8px' }}>
        <span className="eyebrow">Shared bus, latest first</span>
        {events.length === 0 ? (
          <p className="small muted">Nothing emitted yet.</p>
        ) : (
          <ul className="event-log">
            {events.map((event) => (
              <li key={event.seq}>
                <span>#{event.seq}</span>
                <span>{event.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
