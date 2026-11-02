import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isModuleLoadError } from '@/lib/lazyRoute';

describe('isModuleLoadError', () => {
  it('recognises the browser messages for a chunk that a deploy removed', () => {
    const messages = [
      'Failed to fetch dynamically imported module: https://telemed-x.vercel.app/assets/Dashboard-abc123.js',
      'error loading dynamically imported module',
      'Importing a module script failed.',
      "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'.",
      'Loading chunk 42 failed.',
      'ChunkLoadError: Loading chunk vendors failed.',
    ];

    for (const message of messages) {
      expect(isModuleLoadError(new Error(message))).toBe(true);
    }
  });

  it('leaves real application errors to the normal handler', () => {
    expect(isModuleLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isModuleLoadError('NetworkError when attempting to fetch resource.')).toBe(false);
    expect(isModuleLoadError(undefined)).toBe(false);
  });
});

function StaleChunk(): JSX.Element {
  throw new Error(
    'Failed to fetch dynamically imported module: https://telemed-x.vercel.app/assets/Dashboard-abc123.js',
  );
}

describe('ErrorBoundary on a stale tab', () => {
  it('offers a reload instead of a retry that cannot succeed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <StaleChunk />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/newer version of this app/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });
});
