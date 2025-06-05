export default () => ({
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  SWAGGER_ROUTE: process.env.SWAGGER_ROUTE ?? 'api-docs',
  API_KEY: process.env.API_KEY,
})
