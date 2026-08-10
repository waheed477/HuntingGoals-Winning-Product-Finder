const SENSITIVE_PATHS = ['/api/auth/login', '/api/auth/register', '/api/user/password'];

export function logRequest(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const isSensitive = SENSITIVE_PATHS.some((p) => req.url.startsWith(p));

    const entry = {
      ts:       new Date().toISOString(),
      method:   req.method,
      url:      isSensitive ? req.url.split('?')[0] : req.url,
      status:   res.statusCode,
      ms:       duration,
      ip:       req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown',
      ua:       req.headers['user-agent']?.slice(0, 80) || 'unknown',
    };

    const level = res.statusCode >= 500 ? 'ERROR'
                : res.statusCode >= 400 ? 'WARN'
                : 'INFO';

    console.log(`[${level}] ${JSON.stringify(entry)}`);
  });

  next();
}

export function logError(err, req, res, next) {
  console.error(JSON.stringify({
    ts:     new Date().toISOString(),
    level:  'ERROR',
    error:  err.message,
    stack:  err.stack?.split('\n').slice(0, 5).join(' | '),
    url:    req.url,
    method: req.method,
    ip:     req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown',
  }));

  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}
