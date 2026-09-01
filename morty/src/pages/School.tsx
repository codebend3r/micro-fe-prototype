import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import type { Bus, BusEvent } from '@mfe/shared-core';

/** Route 2 of 3. Listens on the shared bus, which is global on purpose. */
export function School({ bus }: { bus: Bus }) {
  const [latest, setLatest] = useState<BusEvent | null>(() => bus.getLog()[0] ?? null);

  useEffect(() => bus.onLog(() => setLatest(bus.getLog()[0] ?? null)), [bus]);

  return (
    <>
      <div className="note">
        <strong>Second of three</strong>
        <span>
          This page subscribes to the bus world passed in as a mount prop. Toggle the theme in
          world's header, or add something on rick's Garage page, and the event shows up here even
          though neither of those apps shares a React tree with this one.
        </span>
      </div>

      <div className="totals">
        <span>Latest event on the shared bus</span>
        <span className="totals-value">{latest ? `#${latest.seq} ${latest.type}` : 'none yet'}</span>
      </div>

      <div className="row">
        <Link href="/inventory" className="btn btn-sm btn-primary">
          On to the Inventory
        </Link>
        <Link href="/" className="btn btn-sm">
          Back home
        </Link>
      </div>
    </>
  );
}
