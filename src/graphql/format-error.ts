/** graphql imports */
import { GraphQLError } from 'graphql';

/** local imports */ 
import { ResponseError } from '../common/responses/response-error';

export function formatGraphQLError(error: GraphQLError) {
  const originalError = error.originalError;

  if (originalError instanceof ResponseError) {
    return {
      message: originalError.message,
      code: originalError.code,
      success: originalError.success,
      timestamp: originalError.timestamp,
    };
  }

  return {
    message: error.message,
    code: 500,
    success: false,
    timestamp: new Date().toISOString(),
  };
}
