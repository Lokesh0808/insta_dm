/**
 * Application error hierarchy. Every error thrown in the app should extend AppError
 * so the central error handler can translate it into a consistent HTTP response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(message, 429, 'TOO_MANY_REQUESTS', details);
  }
}

export class PlanLimitError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 402, 'PLAN_LIMIT_REACHED', details);
  }
}

export class IntegrationError extends AppError {
  constructor(message: string, statusCode = 502, details?: unknown) {
    super(message, statusCode, 'INTEGRATION_ERROR', details);
  }
}

export class SubscriptionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 402, 'SUBSCRIPTION_ERROR', details);
  }
}
