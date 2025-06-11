import { ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { GqlThrottlerGuard } from '../rate-limit-custom.guard'
import { Throttle, ThrottlerModuleOptions, ThrottlerStorageService } from '@nestjs/throttler'
import { Reflector } from '@nestjs/core'

describe('GqlThrottlerGuard', () => {
  let mockStorageService: ThrottlerStorageService
  let mockReflector: Reflector
  let mockOptions: ThrottlerModuleOptions

  beforeEach(() => {
    mockStorageService = {
      getRecord: jest.fn(),
      addRecord: jest.fn(),
    } as any

    mockReflector = new Reflector()
    mockOptions = { throttlers: [{ ttl: 60000, limit: 5 }] }
  })

  // Unit test No. 1 -> Check if the guard is applied to the correct context.
  it('should extract req and res from GraphQL context', () => {
    const mockReq = { ip: '127.0.0.1' }
    const mockRes = {}
    const gqlContext = {
      getContext: () => ({ req: mockReq, res: mockRes }),
    }

    const executionContext = {
      getType: () => 'graphql',
    } as unknown as ExecutionContext

    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValueOnce(gqlContext as any)

    const guard = new GqlThrottlerGuard(mockOptions, mockStorageService, mockReflector)
    const result = guard.getRequestResponse(executionContext)

    expect(result.req).toBe(mockReq)
    expect(result.res).toBe(mockRes)
  })

  // Unit test No. 2 -> Allow request under the rate limit.
  it('should allow request under the rate limit', async () => {
    const context = {
        getHandler: jest.fn().mockReturnValue(() => {}),
        getClass: jest.fn().mockReturnValue(() => {}),
      } as unknown as ExecutionContext
      
    const now = Date.now()
  
    const mockStorageService = {
      getRecord: jest.fn().mockResolvedValue([now - 50_000]), // solo 1 request anterior
      addRecord: jest.fn(),
    } as any
  
    const guard = new GqlThrottlerGuard(
        { throttlers: [{ ttl: 60, limit: 5 }] },
      mockStorageService,
      new Reflector(),
    )
  
    ;(guard as any).getTracker = jest.fn().mockResolvedValue('ip:123.456.789.000')
  
    const result = await guard.canActivate(context)
    expect(result).toBe(true)
  })

  
  // Unit test No. 3 -> Reject request over the rate limit.
  it('should throw if rate limit is exceeded', async () => {
    const context = {
        getHandler: jest.fn().mockReturnValue(() => {}),
        getClass: jest.fn().mockReturnValue(() => {}),
      } as unknown as ExecutionContext
      
    const now = Date.now()
  
    const mockStorageService = {
      getRecord: jest.fn().mockResolvedValue([
        now - 1_000,
        now - 2_000,
        now - 3_000,
        now - 4_000,
        now - 5_000,
      ]), // 5 requests done
      addRecord: jest.fn(),
    } as any
  
    const guard = new GqlThrottlerGuard(
        { throttlers: [{ ttl: 60, limit: 5 }] },
      mockStorageService,
      new Reflector(),
    )
  
    ;(guard as any).getTracker = jest.fn().mockResolvedValue('ip:123.456.789.000')
  
    await expect(guard.canActivate(context)).rejects.toThrow('Too Many Requests')
  })
})

  // Unit test No. 4 -> Check if the decorator is applied to the correct method.
  describe('Throttle decorator metadata', () => {
    it('should attach throttler:limit and throttler:ttl metadata', () => {
      class DummyResolver {
        @Throttle({ default: { limit: 2, ttl: 30 } })
        dummyQuery() {
          return 'OK'
        }

      }

      console.log(
        'Metadata keys:',
        Reflect.getMetadataKeys(DummyResolver.prototype, 'dummyQuery')
      )
  
      const limit = Reflect.getMetadata(
        'throttler:limit',
        DummyResolver.prototype,
        'dummyQuery'
      )
      const ttl = Reflect.getMetadata(
        'throttler:ttl',
        DummyResolver.prototype,
        'dummyQuery'
      )
  
      expect(limit).toBe(2)
      expect(ttl).toBe(30)
    })
  })

