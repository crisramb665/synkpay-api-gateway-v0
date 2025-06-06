export default () => ({
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  API_KEY: process.env.API_KEY,
  RATE_LIMIT_GLOBAL: parseInt(process.env.RATE_LIMIT_GLOBAL ?? '100', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  RATE_LIMIT_EXEMPT_ROUTES: (process.env.RATE_LIMIT_EXEMPT_ROUTES ?? '/health,/login').split(','),
})
