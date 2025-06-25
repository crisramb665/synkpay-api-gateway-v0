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
## 📚 Logging & Error Management

This section documents the structured logging and centralized error handling system implemented in the SynkPay API Gateway.

It covers two main components:
- **Structured Logging & Monitoring** – Using a custom `LoggerService`, correlation ID middleware, and interceptors.
- **Centralized Error Management** – Using `CustomGraphQLError` and consistent GraphQL error formatting.

---

### 📦 Structured Logging & Monitoring

LoggerService -> A reusable and injectable service wrapping Winston, configured via `ConfigService`. Outputs fully structured JSON logs supporting:

- `correlationId` (generated per request)
- `userId`, `operationName`, `operationType`
- `type`: distinguishes between `"request"` and `"event"`
- Log levels: `info`, `warn`, `error`, `debug`, `event`

Logging behavior is controlled by the following environment variables (via `ConfigService`):

| Variable            | Description                              | Default        |
|---------------------|------------------------------------------|----------------|
| `LOG_LEVEL`         | Log level (e.g. info, debug, error)      | `info`         |
| `LOG_TO_CONSOLE`    | Whether to log to console                | `true`         |
| `LOG_TO_FILE`       | Whether to write logs to a file          | `false`        |
| `LOG_FILE_PATH`     | Path for file-based logging              | `logs/app.log` |

#### 🧩 Middleware: CorrelationIdMiddleware

Registers a unique `correlationId` per request. Adds it to:
- `req['correlationId']` (for interceptors, context, etc.)
- Response header `x-correlation-id`

Located at: `src/logging/middleware/correlation-id.middleware.ts`

#### 🧩 GraphQL Logging Interceptor

Registered globally via `APP_INTERCEPTOR`. Logs:
- Operation name and type
- Duration
- `correlationId` and `userId`
- Error trace if applicable

#### 🔁 HttpLoggerService (Outbound Requests)

Custom wrapper over `HttpService`. Used for microservice communication.

- Automatically injects `correlationId` and `userId` into headers
- Logs method, URL, status, duration or errors
- Used instead of direct `httpService.request(...)` calls

---

### ✅ Logger Tests

| Component                   | Test File                                           |
|----------------------------|-----------------------------------------------------|
| `LoggerService`            | `logger.service.spec.ts`                            |
| `HttpLoggerService`        | `http-logger.service.spec.ts`                       |
| `GraphQLLoggingInterceptor`| `graphql-logging.interceptor.spec.ts`               |

---

### ❗ Centralized Error Management

Purpose -> Improve control and visibility over runtime errors across the API Gateway.

#### 🧱 `CustomGraphQLError`

Custom class extending `GraphQLError` with:
- `extensions.code`: numeric code
- `extensions.success`: boolean
- `extensions.timestamp`: included if `includeTimestamp = true`

Used for consistent error output structure across all GraphQL layers.

#### ⚙️ `formatGraphQLError`

Registered in `GraphQLModule` to normalize all outgoing error responses. Ensures that:
- All GraphQL errors follow the same shape
- Only safe fields are exposed to clients

#### 🧪 TestErrorResolver & TestErrorService

Implemented to validate the entire error handling pipeline:
- `TestErrorResolver`: throws controlled test exceptions
- `TestErrorService`: triggers service-level nested errors
- Confirms that all errors are formatted and surfaced correctly

---

### 🧪 Error Management Tests

| Component              | Purpose                                  |
|------------------------|------------------------------------------|
| `TestErrorResolver`    | GraphQL operation that throws test error |
| `TestErrorService`     | Triggers nested service-level exceptions |
| `formatGraphQLError`   | Validates output structure and mapping   |

---

## 📬 Contact

- Maintainer: [Novatide Labs](https://github.com/aialphanovatide)
- Email: team@novatidelabs.com

---
