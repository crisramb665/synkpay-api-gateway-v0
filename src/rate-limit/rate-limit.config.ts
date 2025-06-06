export const defaultRateLimitConfig = {
    globalLimit: parseInt(process.env.RATE_LIMIT_GLOBAL || '100'), // requests
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minuto por defecto
    exemptRoutes: (process.env.RATE_LIMIT_EXEMPT_ROUTES || '/health,/login').split(','), // exempt routes
  };
  