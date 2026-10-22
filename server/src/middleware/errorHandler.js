export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal server error occurred.'
  let errors = err.errors || null

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400
    message = 'Validation failed.'
    errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }))
  }

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    statusCode = 409
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field'
    message = `A unique constraint failed on ${target}. Record already exists.`
  } else if (err.code === 'P2025') {
    statusCode = 404
    message = 'Record not found in database.'
  } else if (err.code === 'P2003') {
    statusCode = 400
    message = 'Foreign key constraint violation. Referenced record does not exist.'
  }

  // Hide stack trace in production
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  }

  res.status(statusCode).json(response)
}
