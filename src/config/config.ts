export default () => ({
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  SWAGGER_PATH: process.env.SWAGGER_PATH ?? 'api/docs',
  API_KEY: process.env.API_KEY,
})
