/* Stand-in for @decky/api with test hooks (__setCallable / __emit / __reset). */
type AnyFn = (...args: any[]) => any;

const callables = new Map<string, AnyFn>();
const listeners = new Map<string, Set<AnyFn>>();

export function __setCallable(name: string, impl: AnyFn): void {
  callables.set(name, impl);
}

export function __emit(event: string, ...args: any[]): void {
  listeners.get(event)?.forEach((cb) => cb(...args));
}

export function __reset(): void {
  callables.clear();
  listeners.clear();
  toaster.toasts.length = 0;
}

export function callable<Args extends any[], Ret>(name: string) {
  return async (...args: Args): Promise<Ret> => {
    const impl = callables.get(name);
    if (!impl) throw new Error(`no mock for callable '${name}' — call __setCallable first`);
    return impl(...args);
  };
}

export function addEventListener(event: string, cb: AnyFn): void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(cb);
}

export function removeEventListener(event: string, cb: AnyFn): void {
  listeners.get(event)?.delete(cb);
}

export const toaster = {
  toasts: [] as any[],
  toast(t: any) {
    this.toasts.push(t);
  },
};

export const fetchNoCors: typeof fetch = (...args) => fetch(...args);

export const routerHook = {
  routes: new Map<string, any>(),
  addRoute(path: string, component: any, _opts?: any) {
    this.routes.set(path, component);
  },
  removeRoute(path: string) {
    this.routes.delete(path);
  },
};

export function definePlugin(fn: () => any) {
  return fn;
}
