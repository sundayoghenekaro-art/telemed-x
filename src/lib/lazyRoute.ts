import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Route chunks are content-hashed per build. A tab left open across a deploy
 * asks for the previous build's chunk; the catch-all rewrite answers with
 * index.html, so the module import fails on the MIME check and the error
 * boundary replaces the screen with a reference code. Reloading once picks up
 * the current build — the first place this bites is the dashboard chunk right
 * after signing in.
 */

const RELOAD_KEY = 'trika:module-reload-at';
const RELOAD_WINDOW_MS = 30_000;

const MODULE_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /failed to load module script/i,
  /loading chunk \S+ failed/i,
  /chunkloaderror/i,
];

export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return MODULE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function reloadForFreshBuild(): boolean {
  if (typeof sessionStorage === 'undefined') return false;

  const now = Date.now();
  const previous = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  // One reload per window: a genuinely broken deploy must surface the boundary
  // instead of trapping the tab in a refresh loop.
  if (now - previous < RELOAD_WINDOW_MS) return false;

  sessionStorage.setItem(RELOAD_KEY, String(now));
  window.location.reload();
  return true;
}

export function lazyRoute(
  load: () => Promise<{ default: ComponentType<any> }>,
): LazyExoticComponent<ComponentType<any>> {
  return lazy(() =>
    load().catch((error: unknown) => {
      if (isModuleLoadError(error) && reloadForFreshBuild()) {
        // The page is navigating away; hold the Suspense fallback, not a crash.
        return new Promise<{ default: ComponentType<any> }>(() => {});
      }
      throw error;
    }),
  );
}
