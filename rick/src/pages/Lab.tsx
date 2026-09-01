import { useState } from 'react';
import { Link } from 'wouter';

/** Route 2 of 2. Local state only, to show it survives sibling navigation. */
export function Lab() {
  const [experiments, setExperiments] = useState(0);

  return (
    <>
      <div className="note">
        <strong>This page belongs to rick, not to world</strong>
        <span>
          World matched <span className="mono">/rick</span> and stopped reading. Rick's own wouter
          matched <span className="mono">/lab</span> underneath it. Press back and you land on
          Garage, because the link that brought you here pushed a real history entry.
        </span>
      </div>

      <div className="totals">
        <span>Experiments run this visit</span>
        <span className="totals-value">{experiments}</span>
      </div>

      <div className="row">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setExperiments((n) => n + 1)}
        >
          Run experiment
        </button>
        <Link href="/" className="btn btn-sm">
          Back to Garage
        </Link>
      </div>

      <p className="small muted">
        Navigating to Garage and back keeps this counter, because rick's root stays mounted while
        the URL stays under /rick. Navigating to Morty resets it, because world unmounts rick.
      </p>
    </>
  );
}
