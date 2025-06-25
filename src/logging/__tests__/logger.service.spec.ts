/** npm imports */
import * as winston from 'winston'

/** local imports */
import { LoggerService } from '../logger.service'

// Only mock createLogger, keep the real transports
jest.mock('winston', () => {
  const actualWinston = jest.requireActual('winston')

  return {
    ...actualWinston,
    createLogger: jest.fn(),
  } as typeof import('winston')
})

describe('LoggerService', () => {
  let loggerService: LoggerService
  let mockedLogger: jest.Mocked<winston.Logger>

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const defaults: Record<string, string> = {
        LOG_TO_CONSOLE: 'false',
        LOG_TO_FILE: 'false',
        LOG_FILE_PATH: 'logs/app.log',
        LOG_LEVEL: 'info',
      }
      return defaults[key]
    }),
  }

  beforeEach(() => {
    mockedLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as any
    ;(winston.createLogger as jest.Mock).mockReturnValue(mockedLogger)

    loggerService = new LoggerService(mockConfigService as any)
  })

  it('should call info with formatted message on log()', () => {
    loggerService.log('Test info', { correlationId: 'abc123' })

    expect(mockedLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test info',
        correlationId: 'abc123',
        level: 'info',
      }),
    )
  })

  it('should call error with formatted message and stack on error()', () => {
    loggerService.error('Test error', 'STACK_TRACE', {
      correlationId: 'xyz789',
    })

    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error',
        correlationId: 'xyz789',
        stack: 'STACK_TRACE',
        level: 'error',
      }),
    )
  })

  it('should call warn on warn()', () => {
    loggerService.warn('Warning log')
    expect(mockedLogger.warn).toHaveBeenCalled()
  })

  it('should call debug on debug()', () => {
    loggerService.debug('Debug log')
    expect(mockedLogger.debug).toHaveBeenCalled()
  })

  it('should log events with type: event', () => {
    loggerService.event('Test event', { correlationId: 'event123' })

    expect(mockedLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test event',
        correlationId: 'event123',
        type: 'event',
        level: 'event',
      }),
    )
  })
})
