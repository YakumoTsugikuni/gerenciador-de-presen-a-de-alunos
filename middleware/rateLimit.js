const attempts = new Map();

function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.path}:${req.ip}`;
    const now = Date.now();
    const current = attempts.get(key);
    const entry = current && now - current.startedAt < windowMs
      ? current
      : { startedAt: now, count: 0 };

    entry.count += 1;
    attempts.set(key, entry);

    if (entry.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - entry.startedAt)) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
    }

    next();
  };
}

module.exports = rateLimit;