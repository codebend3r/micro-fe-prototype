import type { ReactElement } from 'react';
import type { BusEvent, ProbeSnapshot, ScriptMeasurement } from '@mfe/shared-core';

export function ProbePanel(props: {
  option: 1 | 2;
  snapshot: ProbeSnapshot;
  scripts: ScriptMeasurement;
  prod: boolean;
  events: BusEvent[];
}): ReactElement;
