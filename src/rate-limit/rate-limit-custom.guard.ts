/** npm imports */
import { ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { GqlExecutionContext } from '@nestjs/graphql'
import { Request, Response } from 'express'

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext): { req: Request; res: Response } {
    const gqlCtx = GqlExecutionContext.create(context)
    const ctx = gqlCtx.getContext<{ req: Request; res: Response }>()

    return { req: ctx.req, res: ctx.res }
  }
}
