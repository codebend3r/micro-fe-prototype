import type { BusEvent, ProbeSnapshot, ScriptMeasurement } from '@mfe/shared-core';

export function useProbeSnapshot(): ProbeSnapshot;
export function useBusEvents(): BusEvent[];
export function useScriptStats(): ScriptMeasurement;
export function useThemeAttribute(theme: string): void;
