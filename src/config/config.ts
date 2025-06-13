export default () => ({
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  API_KEY: process.env.API_KEY,
  SDK_FINANCE_BASE_URL: process.env.SDK_FINANCE_BASE_URL,
  JWT_PUBLIC_KEY_DEV: process.env.JWT_PUBLIC_KEY_DEV ?? '',
  JWT_PUBLIC_KEY_PROD: process.env.JWT_PUBLIC_KEY_PROD ?? '',
  JWT_PRIVATE_KEY_DEV: process.env.JWT_PRIVATE_KEY_DEV ?? '',
  JWT_PRIVATE_KEY_PROD: process.env.JWT_PRIVATE_KEY_PROD ?? '',
  JWT_EXPIRE_TIME: process.env.JWT_EXPIRE_TIME ?? '5h',
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
})
