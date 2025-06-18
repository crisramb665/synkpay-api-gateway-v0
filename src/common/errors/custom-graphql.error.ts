/** graphql imports */
import { GraphQLError, GraphQLErrorOptions } from 'graphql'

export class CustomGraphQLError extends GraphQLError {
  constructor(message: string, code: number, success = false, includeTimestamp = false) {
    const extensions: Record<string, any> = {
      code,
      success,
    }

    if (includeTimestamp) {
      extensions.timestamp = new Date().toISOString()
    }

    super(message, {
      extensions,
    } as GraphQLErrorOptions)

    Object.defineProperty(this, 'name', { value: 'CustomGraphQLError' })
  }
}
