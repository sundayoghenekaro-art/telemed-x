import { supabase } from '@/integrations/supabase/client';

/**
 * Buckets holding personal data are private. Rows store the object path (not a
 * public URL); the UI mints a short-lived signed URL whenever it needs to render
 * or open the object.
 */
export const SIGNED_URL_TTL_SECONDS = 600;

/**
 * Accepts either a bare object path or a legacy public URL and returns the
 * object path inside `bucket`. Returns null when the value belongs to another
 * bucket or cannot be parsed.
 */
export function storagePathFrom(value: string | null | undefined, bucket: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const marker = `/${bucket}/`;
  const index = trimmed.indexOf(marker);
  if (index >= 0) {
    const rest = trimmed.slice(index + marker.length).split('?')[0].split('#')[0];
    return rest ? decodeURIComponent(rest) : null;
  }

  // Anything with a URI scheme (http:, data:, blob:, ...) is not an object key.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;

  const rest = trimmed.split('?')[0].split('#')[0];
  return rest || null;
}

/**
 * `downloadName` asks Storage to serve the object as an attachment with that
 * filename; omit it for inline viewing.
 */
export async function signedUrl(
  bucket: string,
  value: string | null | undefined,
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
  downloadName?: string,
): Promise<string | null> {
  const path = storagePathFrom(value, bucket);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, downloadName ? { download: downloadName } : undefined);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
