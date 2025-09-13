import { Catch, ArgumentsHost } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const context = gqlHost.getContext();

    console.error('GraphQL Exception:', {
      message: exception.message,
      stack: exception.stack,
      context: {
        req: context.req?.url,
        user: context.req?.user?.id,
      },
    });

    // Handle different types of exceptions
    if (exception instanceof GraphQLError) {
      return exception;
    }

    // Handle Prisma errors
    if (exception.code === 'P2002') {
      return new GraphQLError('A record with this information already exists', {
        extensions: {
          code: 'DUPLICATE_RECORD',
          field: exception.meta?.target,
        },
      });
    }

    if (exception.code === 'P2025') {
      return new GraphQLError('Record not found', {
        extensions: {
          code: 'RECORD_NOT_FOUND',
        },
      });
    }

    // Handle validation errors
    if (exception.name === 'ValidationError') {
      return new GraphQLError('Validation failed', {
        extensions: {
          code: 'VALIDATION_ERROR',
          details: exception.details,
        },
      });
    }

    // Handle authentication errors
    if (exception.message?.includes('Unauthorized') || exception.status === 401) {
      return new GraphQLError('Authentication required', {
        extensions: {
          code: 'UNAUTHORIZED',
        },
      });
    }

    // Handle authorization errors
    if (exception.message?.includes('Forbidden') || exception.status === 403) {
      return new GraphQLError('Insufficient permissions', {
        extensions: {
          code: 'FORBIDDEN',
        },
      });
    }

    // Default error
    return new GraphQLError(exception.message || 'Internal server error', {
      extensions: {
        code: 'INTERNAL_ERROR',
      },
    });
  }
}
