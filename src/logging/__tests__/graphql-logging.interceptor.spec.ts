/** npm imports */
import { ExecutionContext, CallHandler } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { GqlExecutionContext } from '@nestjs/graphql'

/** local imports */
import { GraphQLLoggingInterceptor } from '../graphql-logging.interceptor'
import { LoggerService } from '../logger.service'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}))

describe('GraphQLLoggingInterceptor', () => {
  let interceptor: GraphQLLoggingInterceptor
  let logger: LoggerService

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  }

  const mockReq = {
    correlationId: 'abc-123',
    user: { id: 'user-1' },
  }

  const mockGqlCtx = {
    getContext: () => ({ req: mockReq }),
    getInfo: () => ({
      operation: { operation: 'query' },
      fieldName: 'getHealth',
    }),
  }

  beforeEach(() => {
    ;(GqlExecutionContext.create as jest.Mock).mockReturnValue(mockGqlCtx)
    logger = mockLogger as any
    interceptor = new GraphQLLoggingInterceptor(logger)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should log GraphQL request success', async function (this: void) {
    const mockCallHandler: CallHandler = {
      handle: () => of('ok'),
    }

    const context = {} as ExecutionContext

    await interceptor.intercept(context, mockCallHandler).toPromise()

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('GraphQL QUERY getHealth completed'),
      expect.objectContaining({
        operationName: 'getHealth',
        operationType: 'query',
        correlationId: 'abc-123',
        userId: 'user-1',
        type: 'request',
      }),
    )
  })

  it('should log GraphQL request failure', async function (this: void) {
    const error = new CustomGraphQLError('Internal Server Error', 500)
    error.stack = 'mock-stack'

    const mockCallHandler: CallHandler = {
      handle: () => throwError(() => error),
    }

    const context = {} as ExecutionContext

    await expect(interceptor.intercept(context, mockCallHandler).toPromise()).rejects.toThrow(error)

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('GraphQL QUERY getHealth failed'),
      'mock-stack',
      expect.objectContaining({
        operationName: 'getHealth',
        operationType: 'query',
        correlationId: 'abc-123',
        userId: 'user-1',
        type: 'request',
      }),
    )
  })
})
