/** npm imports */
import { BadRequestException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

/** local imports */
import { RequestValidatorMiddleware } from '../middleware/request-validator.middleware'

const mockLogger = {
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
}

const createRequest = (headers = {}, body = {}): Partial<Request> => ({
  headers,
  body,
  url: '/graphql',
})

const createResponse = (): Partial<Response> => ({})

describe('RequestValidatorMiddleware', () => {
  let middleware: RequestValidatorMiddleware
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    middleware = new RequestValidatorMiddleware(mockLogger as any)
    res = createResponse()
    next = jest.fn()
    jest.clearAllMocks()
  })

  it('should allow a valid request', () => {
    req = createRequest({ 'content-length': '1000' }, { data: 'safe' })
    expect(() => middleware.use(req as Request, res as Response, next)).not.toThrow()
    expect(next).toHaveBeenCalled()
  })

  it('should block large payloads', () => {
    req = createRequest({ 'content-length': '200000' }, { data: 'too large' })
    expect(() => middleware.use(req as Request, res as Response, next)).toThrow(BadRequestException)
    expect(mockLogger.error).toHaveBeenCalledWith('Payload too large: 200000 bytes')
  })

  it('should block suspicious patterns in body', () => {
    req = createRequest({ 'content-length': '100' }, { query: 'eval(something)' })
    expect(() => middleware.use(req as Request, res as Response, next)).toThrow(BadRequestException)
    expect(mockLogger.error).toHaveBeenCalledWith('Suspicious payload detected: {"query":"eval(something)"}')
  })

  it('should block forbidden headers', () => {
    req = createRequest({ 'x-forwarded-for': '1.2.3.4', 'content-length': '100' }, { data: 'safe' })
    expect(() => middleware.use(req as Request, res as Response, next)).toThrow(BadRequestException)
    expect(mockLogger.error).toHaveBeenCalledWith('Disallowed header detected: x-forwarded-for')
  })
})
