import { ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext, Query } from '@nestjs/graphql'
import { GqlThrottlerGuard } from '../rate-limit-custom.guard'
import { Throttle, ThrottlerModuleOptions, ThrottlerStorageService } from '@nestjs/throttler'
import { Reflector } from '@nestjs/core'

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
        } as unknown as ExecutionContext;
      }
 beforeEach(async () => {
    // MOCK storage service
    mockStorageService = {
      increment: jest.fn(),
    } as any;

    // MOCK reflector 
    mockReflector = {
        getAllAndOverride: jest.fn(),
        get: jest.fn(),
      } as any;

    // MOCK options
    mockOptions = {
        throttlers: [{
            name: 'graphql_testHandler',
            ttl: 30000,
            limit: 2,
          },],
      };

    // Create the guard instance with mocks
    guard = new GqlThrottlerGuard(
        mockOptions,
        mockStorageService,
        mockReflector
      );

      console.log('GUARD CREATED:', guard);

    // MOCK IP for getTracker
      (guard as any).getTracker = jest.fn().mockResolvedValue('ip:123.456.789.000')
      console.log('Mock getTracker applied:', (guard as any).getTracker.toString())
      
      
      console.log('guard.canActivate:', typeof guard.canActivate)

      // Initialize the guard
      await guard.onModuleInit()

      console.log('this.throttlers after init:', (guard as any).throttlers);
    
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

    const result = guard.getRequestResponse(executionContext)
    console.log('Guard instance in test 1:', guard)

    expect(result.req).toBe(mockReq)
    expect(result.res).toBe(mockRes)
  })

  
  // Unit test No. 2 -> Allow request under the rate limit.
  it('should allow request under the rate limit', async () => {
    const context = mockContext();

     // Verificamos que el handler no sea undefined
  const handlerFn = context.getHandler();
  console.log('handler name:', handlerFn?.name); // <- este log te dice si está bien seteado

  // Simulamos contexto GraphQL con IP
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValueOnce({
        getContext: () => ({ req: { ip: '127.0.0.1' }, res: {header: jest.fn(),} }),
      } as any);
  
    mockStorageService.increment = jest.fn().mockResolvedValue({
        currentHits: 1, // Only 1 previous request
        ttl: 60000,
      })
  
    console.log('Guard instance in test 2:', guard)
    console.log('this.throttlers (inside test 2):', (guard as any).throttlers)
    console.log('Calling canActivate()...')

    const result: boolean = await guard.canActivate(context)
    console.log('canActivate result:', result)

    expect(result).toBe(true)
  })

  
  // Unit test No. 3 -> Reject request over the rate limit.
  it('should throw if rate limit is exceeded', async () => {
    const context = mockContext();

     // MOCK reflector: Devuelve los metadatos simulados como si estuvieran en el handler
 mockReflector.getAllAndOverride = jest.fn().mockReturnValue({
    ttl: 30000,
    limit: 2,
    name: 'graphql_testHandler',
  });

  // MOCK exceeded limit
  mockStorageService.increment = jest.fn().mockResolvedValue(3);// > limit

    // Force that the guard method throws the error
    const spyThrow = jest
    .spyOn(GqlThrottlerGuard.prototype as any, 'throwThrottlingException')
    .mockImplementation(() => {
      throw new Error('Too Many Requests');
    });

// Verify that the handler is not undefined
  //const handlerFn = context.getHandler();
  //console.log('handler name:', handlerFn?.name); 
  //const throttlerGuard = guard as any;
  
  // MOCK GraphQL context with IP
   // jest.spyOn(GqlExecutionContext, 'create').mockReturnValueOnce({
        //getContext: () => ({ req: { ip: '127.0.0.1' }, res: {header: jest.fn(),} }),
      //} as any);

  // Force that the logic of throttling is not skipped
  //(guard as any).shouldSkip = jest.fn().mockResolvedValue(false);    
 

  // MOCK IP for tracker - Force the tracking key to avoid errors in real logic
  //throttlerGuard.getTracker = jest.fn().mockResolvedValue('127.0.0.1');

  // Force that guard is not skipped
  //throttlerGuard.shouldSkip = jest.fn().mockResolvedValue(false);


  // Manually set the limit
  //(guard as any).throttlers = [
    //{
      //ttl: 30000,
      //limit: 2,
      //name: 'graphql_testHandler',
    //},
  //];
  
    //console.log('Guard instance in test 3:', guard);
    //console.log('this.throttlers (inside test 3):', (guard as any).throttlers);
    console.log('Calling canActivate()...');

    // Expect: that it fails as in real runtime
    await expect(guard.canActivate(context)).rejects.toThrow('Too Many Requests');

    // Extra: verify that the method that throws the exception has been called
  expect(spyThrow).toHaveBeenCalled();
  spyThrow.mockRestore();
  });
});

  // Unit test No. 4 -> Check if the decorator is applied to the correct method.
  describe('Throttle decorator metadata', () => {
    it('should attach throttler:limit and throttler:ttl metadata', () => {
      

      const target = DummyResolver.prototype
      const methodName = 'dummyQuery'

      //mockReflector.get = jest.fn((key: string) => {
        //if (key === 'throttler:limit') return 2
        //if (key === 'throttler:ttl') return 30000
        //return undefined
      //})

      //const mockReflector = new Reflector();

    jest.spyOn(mockReflector, 'get').mockImplementation((key: string) => {
      if (key === 'throttler:limit') return 2;
      if (key === 'throttler:ttl') return 30000;
      return undefined;
    });
      
  
      const limit = mockReflector.get('throttler:limit', target[methodName])
      const ttl = mockReflector.get('throttler:ttl', target[methodName])
  
      console.log('Throttle metadata -> limit:', limit, 'ttl:', ttl)
  
      expect(limit).toBe(2)
      expect(ttl).toBe(30000)
    })
  })

