# SynkPay API Gateway

A lightweight API gateway built with [NestJS](https://nestjs.com/) to orchestrate and manage HTTP traffic between multiple microservices. It acts as a centralized entry point, integrating authentication, proxy routing, and third-party services like SDK.finance.

---

## 🚀 Tech Stack

- **Framework:** NestJS
- **Authentication:** JWT
- **API Documentation:** Swagger (OpenAPI)
- **Deployment:** Docker
- **Third-Party Integration:** [SDK.finance](https://sdk.finance/)
- **Upcoming Features:** GraphQL, KrakenD

---

## 📁 Project Structure

```
.
├── src
│   ├── common/
│   │   └── sdk-finance/
│   ├── config/
│   ├── health/
│   ├── microservices/
├── test/
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── eslint.config.mjs
├── yarn.lock
```

> **Note:** Microservices are managed outside this repository.

---

## 🧪 Running Locally

Install dependencies:

```bash
yarn install
```

Start the server in development mode:

```bash
yarn start:dev
```

Start the server in production mode:

```bash
yarn start:prod
```

---

## 🐳 Docker

Build and run the container:

```bash
docker build -t synkpay-api-gateway .
docker run -p 3000:3000 synkpay-api-gateway
```

---

## 🧪 Testing

Run unit tests:

```bash
yarn test
```

Run end-to-end tests:

```bash
yarn test:e2e
```

Generate test coverage:

```bash
yarn test:cov
```

---

## 📄 API Docs (Swagger)

Once the app is running, access the API docs at:

```
http://localhost:4000/api
```

---

## 📦 Environment Variables

Example `.env` file:

```env
PORT=4000
JWT_SECRET=your_jwt_secret
```

---

## 🚦 Rate Limiting

Rate limiting is implemented using a custom `GqlThrottlerGuard` based on NestJS's `@nestjs/throttler` package. It protects GraphQL endpoints from abuse by limiting the number of requests per user/IP within a configured time window.

🔧 Configuration:

Limits are defined globally via environment variables: Currently, default values ​​are seen until the final real values ​​are available.

```env
RATE_LIMIT_GLOBAL=100           # Max requests per window
RATE_LIMIT_WINDOW_MS=60000      # Window duration in milliseconds

These values are injected using ThrottlerModule.forRootAsync() inside AppModule.

⚙️ How It Works
The global guard uses the client's IP address to track and throttle requests. The logic is extended to work with GraphQL using GqlExecutionContext to extract req and res objects. To override the global rate limit for specific GraphQL resolvers, use the @Throttle() decorator

Requests that exceed the allowed rate will receive a 429 Too Many Requests error.

---

## 📬 Contact

- Maintainer: [Novatide Labs](https://github.com/aialphanovatide)
- Email: team@novatidelabs.com

---
