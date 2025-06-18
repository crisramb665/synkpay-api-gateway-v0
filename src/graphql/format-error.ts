/** graphql imports */
import { GraphQLError } from 'graphql'

export function formatGraphQLError(error: GraphQLError) {
  const extensions = {
    ...error.extensions,
    stacktrace: undefined,
  }

  return {
    message: error.message,
    extensions,
  }
}
