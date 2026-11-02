interface RpcClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

/**
 * Fixed-window limit shared by every instance of every edge function.
 * In-memory counters only bound each instance, so real capacity was
 * "limit × instance count". The counter lives in `function_rate_limits`.
 *
 * Fails open: a rate limiter outage must not take the feature down, and the
 * failure is logged so it stays visible.
 */
export async function consumeRateLimit(
  client: RpcClient,
  bucket: string,
  subject: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await client.rpc('consume_rate_limit', {
    p_bucket: bucket,
    p_subject: subject,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.warn(`rate limit unavailable (${bucket}): ${error.message}`);
    return true;
  }

  return data === true;
}
