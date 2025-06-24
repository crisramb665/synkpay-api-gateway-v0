/** npm imports */
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common'
import * as winston from 'winston'
import { transports as winstonTransports } from 'winston'
import { ConfigService } from '@nestjs/config'

export interface LogContext {
  correlationId?: string
  userId?: string
  operationName?: string
  [key: string]: unknown
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger

  constructor(private readonly configService: ConfigService) {
    const transports: winston.transport[] = []

    if (this.configService.get('LOG_TO_CONSOLE') !== 'false') {
      transports.push(new winstonTransports.Console())
    }

    if (this.configService.get('LOG_TO_FILE') === 'true') {
      transports.push(
        new winstonTransports.File({
          filename: this.configService.get('LOG_FILE_PATH') || 'logs/app.log',
        }),
      )
    }

    this.logger = winston.createLogger({
      level: this.configService.get('LOG_LEVEL') || 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports,
    })
  }

  private buildMessage(level: string, message: string, context?: LogContext): object {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    }
  }

  log(message: string, context?: LogContext) {
    this.logger.info(this.buildMessage('info', message, context))
  }

  error(message: string, trace?: string, context?: LogContext) {
    this.logger.error({
      ...this.buildMessage('error', message, context),
      stack: trace,
    })
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(this.buildMessage('warn', message, context))
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(this.buildMessage('debug', message, context))
  }

  event(message: string, context?: LogContext) {
    this.logger.info(this.buildMessage('event', message, { ...context, type: 'event' }))
  }
}
