export default () => ({
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  API_KEY: process.env.API_KEY,
})
