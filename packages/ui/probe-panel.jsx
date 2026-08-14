/**
 * The instrumentation panel. Deliberately shared by both Shells so that the
 * two options are measured by identical code and the numbers are comparable.
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

function InstanceList({ instances, empty }) {
  if (!instances.length) return <p className="small muted">{empty}</p>;
  return (
    <ul className="instance-list">
      {instances.map((instance) => (
        <li className="instance-row" key={instance.id}>
          <span className="mono">{instance.id}</span>
          <span className="small muted">
            {instance.version ? `v${instance.version} ` : ''}
            {instance.apps.join(', ')}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ProbePanel({ option, snapshot, scripts, prod, events }) {
  const reactCount = snapshot.reactInstances.length;
  const versions = [
    ...new Set(snapshot.reactInstances.map((instance) => instance.version)),
  ];

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
        <Stat
          value={reactCount}
          label="React copies"
          tone={option === 1 ? 'ok' : 'accent'}
        />
        <Stat value={versions.join(' + ') || '?'} label="React versions" />
        <Stat value={formatBytes(scripts.bytes)} label="JS transferred" />
        <Stat value={scripts.chunks} label="JS chunks" />
      </div>

      <div className="stack" style={{ gap: '8px' }}>
        <span className="eyebrow">Apps on this page</span>
        <table className="table">
          <thead>
            <tr>
              <th>App</th>
              <th className="mono">React</th>
              <th>Shell session</th>
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
                <td>
                  {app.role === 'shell' ? (
                    <span className="pill pill-accent">owner</span>
                  ) : app.contextConnected ? (
                    <span className="pill pill-ok">
                      <span className="dot" />
                      context
                    </span>
                  ) : (
                    <span className="pill pill-warn">
                      <span className="dot" />
                      {app.channel ?? 'no context'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stack" style={{ gap: '8px' }}>
        <span className="eyebrow">React instances</span>
        <InstanceList instances={snapshot.reactInstances} empty="none yet" />
      </div>

      <div className="stack" style={{ gap: '8px' }}>
        <span className="eyebrow">@mfe/session copies</span>
        <InstanceList
          instances={snapshot.sessionInstances}
          empty="no app has loaded it yet"
        />
      </div>

      <div className="stack" style={{ gap: '8px' }}>
        <span className="eyebrow">@mfe/shared-core copies</span>
        <InstanceList
          instances={snapshot.coreInstances}
          empty="no app has loaded it yet"
        />
      </div>

      <div className="stack" style={{ gap: '8px' }}>
        <span className="eyebrow">JavaScript by origin</span>
        <table className="table">
          <tbody>
            {scripts.byOrigin.map((origin) => (
              <tr key={origin.origin}>
                <td className="mono">{origin.origin.replace('http://', '')}</td>
                <td className="num mono muted">{origin.chunks}</td>
                <td className="num mono">{formatBytes(origin.bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stack" style={{ gap: '8px' }}>
        <span className="eyebrow">Cross app event bus</span>
        {events.length === 0 ? (
          <p className="small muted">nothing emitted yet</p>
        ) : (
          <ul className="event-log">
            {events.map((event) => (
              <li key={event.seq}>
                <span>{String(event.seq).padStart(2, '0')}</span>
                <span>{event.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
