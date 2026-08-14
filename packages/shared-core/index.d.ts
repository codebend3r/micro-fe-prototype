export interface Part {
  sku: string;
  name: string;
  category: string;
}

export interface SelectionItem {
  sku: string;
  count: number;
}

export interface SessionState {
  user: { name: string; role: string };
  theme: 'dark' | 'light';
  route: string;
  selection: SelectionItem[];
}

export interface Store<T> {
  getState(): T;
  setState(patch: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: (state: T) => void): () => void;
}

export interface SessionStore extends Store<SessionState> {
  setTheme(theme: 'dark' | 'light'): void;
  navigate(route: string): void;
  addToSelection(sku: string): void;
  removeFromSelection(sku: string): void;
  clearSelection(): void;
}

export interface BusEvent {
  type: string;
  detail: unknown;
  seq: number;
}

export interface Bus {
  on(type: string, handler: (detail: any) => void): () => void;
  emit(type: string, detail: unknown): void;
  getLog(): BusEvent[];
  onLog(listener: () => void): () => void;
}

export interface AppRecord {
  app: string;
  label: string;
  role: 'shell' | 'remote';
  reactVersion: string;
  reactId: string;
  coreId: string;
  sessionId: string | null;
  contextConnected?: boolean;
  themeSeen?: string | null;
  orderCountSeen?: number | null;
  channel?: string;
}

export interface InstanceGroup {
  id: string;
  apps: string[];
  version: string | null;
}

export interface ProbeSnapshot {
  apps: AppRecord[];
  reactInstances: InstanceGroup[];
  coreInstances: InstanceGroup[];
  sessionInstances: InstanceGroup[];
}

export interface ScriptMeasurement {
  chunks: number;
  bytes: number;
  byOrigin: { origin: string; chunks: number; bytes: number }[];
}

export function createStore<T>(initialState: T): Store<T>;
export function createSessionStore(): SessionStore;
export function createBus(): Bus;
export const bus: Bus;

export const CORE_MODULE_TOKEN: object;
export function registerApp(input: {
  app: string;
  label: string;
  role: 'shell' | 'remote';
  react: unknown;
  sessionToken?: unknown;
}): AppRecord;
export function updateApp(app: string, patch: Partial<AppRecord>): void;
export function unregisterApp(app: string): void;
export function getProbeSnapshot(): ProbeSnapshot;
export function subscribeProbe(listener: () => void): () => void;
export function measureScripts(): ScriptMeasurement;

export const CATALOG: Part[];
export function findPart(sku: string): Part | undefined;
export function formatBytes(bytes: number): string;
