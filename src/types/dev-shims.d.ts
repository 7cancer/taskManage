// Temporary shim types for environments where npm dependencies are not installed.
// These declarations allow `npm run typecheck` to run in restricted containers.
// When real dependencies are installed, actual library types should be used instead.

declare module 'react' {
  export type ReactNode = unknown;
  export type ButtonHTMLAttributes<T> = Record<string, unknown>;
  export type PropsWithChildren<P = unknown> = P & { children?: ReactNode };

  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useState<S>(initialState: S): [S, (value: S) => void];

  export interface ChangeEvent<T = unknown> {
    target: T;
  }

  const React: {
    StrictMode: (props: { children?: ReactNode }) => unknown;
  };

  export default React;
}

declare module 'react/jsx-runtime' {
  export const Fragment: unknown;
  export function jsx(type: unknown, props: unknown, key?: unknown): unknown;
  export function jsxs(type: unknown, props: unknown, key?: unknown): unknown;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element): {
    render(node: unknown): void;
  };
}

declare module 'zustand' {
  export type SetState<T> = (partial: Partial<T>) => void;

  export function create<T>(
    initializer: (set: SetState<T>) => T,
  ): {
    (): T;
    <U>(selector: (state: T) => U): U;
    getState(): T;
  };
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: unknown;
  }
}
