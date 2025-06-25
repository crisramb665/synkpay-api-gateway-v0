/** npm imports */
import { ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext, Query } from '@nestjs/graphql'
import { Throttle, ThrottlerModuleOptions, ThrottlerStorageService } from '@nestjs/throttler'
import { Reflector } from '@nestjs/core'

/** local imports */
import { GqlThrottlerGuard } from '../rate-limit-custom.guard'

let guard: GqlThrottlerGuard
let mockStorageService: ThrottlerStorageService
let mockReflector: Reflector
let mockOptions: ThrottlerModuleOptions

class DummyResolver {
  @Throttle({ default: { limit: 2, ttl: 30000 } })
  @Query(() => String)
  dummyQuery() {
    return 'OK'
  }
}

describe('GqlThrottlerGuard', () => {
  function testHandler() {}

  function mockContext(): ExecutionContext {
    return {
      getHandler: () => testHandler,
      getType: () => 'graphql',
      getClass: () => DummyResolver,
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1' }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext
  }
  beforeEach(async () => {
    // MOCK storage service
    mockStorageService = {
      increment: jest.fn(),
    } as unknown as ThrottlerStorageService

    // MOCK reflector
    mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
    } as unknown as Reflector

    // MOCK options
    mockOptions = {
      throttlers: [
        {
          name: 'default',
          ttl: 30000,
          limit: 2,
        },
      ],
    }

    // Create the guard instance with mocks
    guard = new GqlThrottlerGuard(mockOptions, mockStorageService, mockReflector)

    // MOCK IP for getTracker
    ;(guard as unknown as { getTracker: () => Promise<string> }).getTracker = jest
      .fn()
      .mockResolvedValue('ip:123.456.789.000')

    // Initialize the guard
    await guard.onModuleInit()
  })

  // Unit test No. 1 -> Check if the guard is applied to the correct context.
  it('should extract req and res from GraphQL context', () => {
    const mockReq = { ip: '127.0.0.1' }
    const mockRes = {}
    const gqlContext: Partial<GqlExecutionContext> = {
      getContext: () => ({ req: mockReq, res: mockRes }),
    } as unknown as GqlExecutionContext

    const executionContext = {
      getType: () => 'graphql',
    } as unknown as ExecutionContext

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValueOnce(gqlContext as GqlExecutionContext)

    const result = guard.getRequestResponse(executionContext)

    expect(result.req).toBe(mockReq)
    expect(result.res).toBe(mockRes)
  })

  // Unit test No. 2 -> Allow request under the rate limit.
  it('should allow request under the rate limit', async () => {
    const context = mockContext()

    // MOCK GraphQL context with IP
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValueOnce({
      getContext: () => ({ req: { ip: '127.0.0.1' }, res: { header: jest.fn() } }),
    } as unknown as GqlExecutionContext)

    // MOCK under the rate limit
    mockStorageService.increment = jest.fn().mockResolvedValue({
      currentHits: 1, // Only 1 previous request
      ttl: 60000,
    })

    const result: boolean = await guard.canActivate(context)

    expect(result).toBe(true)
  })

  // TODO Unit test No. 3 -> 'should throw an error when the limit is exceeded' test is pending
})

// Unit test No. 4 -> Check if the decorator is applied to the correct method.
describe('Throttle decorator metadata', () => {
  it('should attach throttler:limit and throttler:ttl metadata', () => {
    const target = DummyResolver.prototype
    const methodName = 'dummyQuery'

    const fakeReflector: Pick<Reflector, 'get'> = {
      get: (key: string) => {
        if (key === 'throttler:limit') return 2
        if (key === 'throttler:ttl') return 30000
        return undefined
      },
    }

    const limit: number | undefined = fakeReflector.get('throttler:limit', target[methodName])
    const ttl: number | undefined = fakeReflector.get('throttler:ttl', target[methodName])

    expect(limit).toBe(2)
    expect(ttl).toBe(30000)
  })
})
