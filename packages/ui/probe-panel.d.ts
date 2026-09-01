import type { ReactElement } from 'react';
import type { BusEvent, ProbeSnapshot, ScriptMeasurement } from '@mfe/shared-core';

export function ProbePanel(props: {
  snapshot: ProbeSnapshot;
  scripts: ScriptMeasurement;
  prod: boolean;
  events: BusEvent[];
  location: string;
}): ReactElement;
