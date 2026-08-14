/**
 * Chrome that both options render identically, so that any visual difference
 * between the two stacks is a real difference and not a styling accident.
 */
import { Component } from 'react';

/**
 * The dashed outline drawn around anything that came from a remote, labelled
 * with which React instance is rendering inside it.
 */
export function RemoteBoundary({ app, version, instanceId, unit, children }) {
  return (
    <section className="remote-boundary">
      <header className="remote-boundary-head">
        <span>
          {app} boundary / integration unit: {unit}
        </span>
        <span>
          React {version} / {instanceId}
        </span>
      </header>
      <div className="remote-boundary-body">{children}</div>
    </section>
  );
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.recover = () => this.setState({ error: null });
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash">
        <strong>Caught by the {this.props.owner} error boundary</strong>
        <code>{error.message}</code>
        {this.props.hint ? <p className="small muted">{this.props.hint}</p> : null}
        <button type="button" className="btn btn-sm" onClick={this.recover}>
          Recover
        </button>
      </div>
    );
  }
}

/** Renders the given source with the marked fragments highlighted. */
export function Code({ children }) {
  return <pre className="code">{children}</pre>;
}
