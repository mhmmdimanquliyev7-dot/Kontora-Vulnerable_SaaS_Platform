export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(401, "Unauthorized", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(403, "Forbidden", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(404, "NotFound", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists.") {
    super(409, "Conflict", message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request.") {
    super(422, "ValidationError", message);
  }
}

// A downstream internal service (report-service, export-worker) was
// unreachable or returned something unexpected — distinct from a 4xx caused
// by the caller's own request, since the caller did nothing wrong here.
export class UpstreamServiceError extends AppError {
  constructor(message = "An internal service is unavailable. Please try again shortly.") {
    super(502, "UpstreamServiceError", message);
  }
}
