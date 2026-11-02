import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * The provider key lives on the server. During `vite dev` the same-origin
 * middleware at `/api/defence-ai` handles requests; every built artifact goes
 * through the authenticated `defence-ai` edge function instead, because the
 * dev middleware does not exist in production.
 */
export const AI_ENDPOINT = '/api/defence-ai';
export const AI_FUNCTION = 'defence-ai';
export const AI_ENV_KEY = 'OPENAI_API_KEY';

export interface AiStatus {
  configured: boolean;
  provider: string;
  model: string;
  reason?: string;
}

export interface TutorSource {
  contentId: string;
  sectionId: string;
  title: string;
  sectionTitle: string;
  startSec: number;
  snippet: string;
}

export interface TutorAnswer {
  answer: string;
  citedSections: number[];
  refused: boolean;
  model: string;
}

export interface DraftResult {
  draft: string;
  model: string;
}

export class AiError extends Error {
  code:
    | 'not_configured'
    | 'credits_exhausted'
    | 'rate_limited'
    | 'invalid'
    | 'provider_error'
    | 'offline'
    | 'unauthorized'
    | 'forbidden';

  constructor(code: AiError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const UNREACHABLE: AiStatus = {
  configured: false,
  provider: 'not configured',
  model: '—',
  reason: 'gateway-unreachable',
};

const useDevMiddleware = import.meta.env.DEV;

function httpStatus(error: unknown): number | null {
  const context = (error as { context?: { status?: number } } | null)?.context;
  return typeof context?.status === 'number' ? context.status : null;
}

let statusPromise: Promise<AiStatus> | null = null;

async function loadDevStatus(): Promise<AiStatus> {
  return fetch(AI_ENDPOINT, { headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) return { ...UNREACHABLE, reason: `http-${response.status}` };
      const data = (await response.json()) as Partial<AiStatus>;
      return {
        configured: Boolean(data.configured),
        provider: data.provider ?? 'unknown',
        model: data.model ?? '—',
        reason: data.reason,
      };
    })
    .catch(() => UNREACHABLE);
}

async function loadFunctionStatus(): Promise<AiStatus> {
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, {
    body: { mode: 'status' },
  });
  if (error) {
    const status = httpStatus(error);
    if (status === 401) return { ...UNREACHABLE, reason: 'sign_in_required' };
    return { ...UNREACHABLE, reason: status ? `http-${status}` : 'gateway-unreachable' };
  }
  const payload = (data ?? {}) as Partial<AiStatus>;
  return {
    configured: Boolean(payload.configured),
    provider: payload.provider ?? 'unknown',
    model: payload.model ?? '—',
    reason: payload.reason,
  };
}

export function loadAiStatus(force = false): Promise<AiStatus> {
  if (!statusPromise || force) {
    statusPromise = useDevMiddleware ? loadDevStatus() : loadFunctionStatus();
  }
  return statusPromise;
}

export function useAiStatus(): AiStatus | null {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadAiStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}

function errorFromStatus(status: number | null): AiError {
  switch (status) {
    case 401:
      return new AiError('unauthorized', 'Sign in with a staff account to use the training assistant.');
    case 403:
      return new AiError('forbidden', 'This account is not permitted to use the training assistant.');
    case 503:
      return new AiError('not_configured', `${AI_ENV_KEY} is not configured on the server.`);
    case 402:
      return new AiError(
        'credits_exhausted',
        'The AI provider account has no credits remaining. Add credits to enable generated answers.',
      );
    case 429:
      return new AiError('rate_limited', 'The AI provider is rate limiting requests. Wait a moment and try again.');
    case 504:
      return new AiError('offline', 'The AI provider timed out. Try again.');
    case 400:
    case 413:
      return new AiError('invalid', 'The request was rejected before reaching the provider.');
    default:
      return new AiError('provider_error', 'The AI provider could not complete the request. Try again.');
  }
}

async function postDev<T>(payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AiError('offline', 'The AI gateway is unreachable.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    const error = errorFromStatus(response.status);
    if (body?.error === 'provider_auth_failed') {
      return Promise.reject(
        new AiError('provider_error', 'The AI provider rejected the server key. An administrator must check OPENAI_API_KEY.'),
      );
    }
    return Promise.reject(error);
  }

  return (await response.json()) as T;
}

async function postFunction<T>(payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, { body: payload });
  if (error) throw errorFromStatus(httpStatus(error));
  return data as T;
}

function request<T>(payload: unknown): Promise<T> {
  return useDevMiddleware ? postDev<T>(payload) : postFunction<T>(payload);
}

export function askTutor(question: string, sources: TutorSource[]): Promise<TutorAnswer> {
  return request<TutorAnswer>({ mode: 'tutor', question, sources });
}

export function generateDraft(input: {
  title: string;
  version: string;
  classification: string;
  transcript: { title: string; text: string }[];
}): Promise<DraftResult> {
  return request<DraftResult>({ mode: 'draft', ...input });
}
