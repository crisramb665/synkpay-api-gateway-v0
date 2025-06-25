/** npm imports */
import { Test, TestingModule } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { of, throwError } from 'rxjs'
import { AxiosResponse } from 'axios'

/** local imports */
import { HttpLoggerService } from '../http-logger.service'
import { LoggerService } from '../logger.service'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'

describe('HttpLoggerService', () => {
  let httpLoggerService: HttpLoggerService

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  }

  const mockHttpService = {
    request: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpLoggerService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile()

    httpLoggerService = module.get<HttpLoggerService>(HttpLoggerService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should send request and log success', async () => {
    const response: AxiosResponse = {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as any },
    }

    mockHttpService.request.mockReturnValueOnce(of(response))

    const result = await httpLoggerService.request({ method: 'GET', url: 'http://mock-service/test' }, {
      correlationId: 'cid-123',
      user: { id: 'u1' },
    } as any)

    expect(result).toEqual(response)
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('HTTP GET http://mock-service/test'),
      expect.objectContaining({
        correlationId: 'cid-123',
        userId: 'u1',
        statusCode: 200,
        type: 'request',
      }),
    )
  })

  it('should log error when request fails', async () => {
    const error = new CustomGraphQLError('Internal Server Error', 500) as CustomGraphQLError & {
      response?: { status?: number }
      stack?: string
    }
    error.stack = 'mock-stack-trace'
    error.response = { status: 500 }

    mockHttpService.request.mockReturnValueOnce(throwError(() => error))

    await expect(
      httpLoggerService.request({ method: 'POST', url: 'http://mock-service/fail' }, {
        correlationId: 'cid-456',
        user: { id: 'u2' },
      } as any),
    ).rejects.toThrow(error)

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('HTTP POST http://mock-service/fail'),
      'mock-stack-trace',
      expect.objectContaining({
        correlationId: 'cid-456',
        userId: 'u2',
        statusCode: 500,
        type: 'request',
      }),
    )
  })
})
