function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 5000) {
        for (const [storedKey, storedEntry] of hits.entries()) {
          if (storedEntry.resetAt <= now) {
            hits.delete(storedKey);
          }
        }
      }
      next();
      return;
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: message });
      return;
    }

    entry.count += 1;
    next();
  };
}

export { createRateLimiter };
