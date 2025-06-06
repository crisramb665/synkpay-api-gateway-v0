export default () => ({
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  SWAGGER_PATH: process.env.SWAGGER_PATH ?? 'api/docs',
  API_KEY: process.env.API_KEY,
  RATE_LIMIT_GLOBAL: parseInt(process.env.RATE_LIMIT_GLOBAL ?? '100', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  RATE_LIMIT_EXEMPT_ROUTES: (process.env.RATE_LIMIT_EXEMPT_ROUTES ?? '/health,/login').split(','),
})
