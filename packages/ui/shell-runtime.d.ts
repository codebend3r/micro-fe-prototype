import type {
  BusEvent,
  ProbeSnapshot,
  ScriptMeasurement,
  SessionState,
  SessionStore,
} from '@mfe/shared-core';

export function useProbeSnapshot(): ProbeSnapshot;
export function useBusEvents(): BusEvent[];
export function useScriptStats(): ScriptMeasurement;
export function useThemeAttribute(theme: string, option: 1 | 2): void;
export function useHashRoute(store: SessionStore): void;
export function useCompareBridge(store: SessionStore): void;
export function useTelemetryUplink(
  option: 1 | 2,
  snapshot: ProbeSnapshot,
  scripts: ScriptMeasurement,
  state: SessionState,
): void;
