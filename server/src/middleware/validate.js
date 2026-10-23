import { AppError } from './errorHandler.js'

export function validate(schema) {
  return (req, res, next) => {
    try {
      // A malformed id in the URL is simply a record that does not exist
      if (schema.params) {
        const parsed = schema.params.safeParse(req.params)
        if (!parsed.success) return next(new AppError('Record not found.', 404))
        req.params = parsed.data
      }
      if (schema.body) req.body = schema.body.parse(req.body)
      if (schema.query) req.query = schema.query.parse(req.query)
      next()
    } catch (err) {
      next(err)
    }
  }
}
