// Validate again at the network boundary, including data inserted by administrators.
export function allowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash
      && (['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(url.hostname)
        || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname));
  } catch { return false; }
}

export function webPushFailure(status: number | undefined, attempts: number) {
  const expired = status === 404 || status === 410;
  const retryable = status === undefined || status === 408 || status === 429 || status >= 500;
  return { expired, status: !expired && retryable && attempts < 8 ? 'pending' : 'failed',
    delaySeconds: Math.min(3600, 30 * 2 ** attempts) };
}
