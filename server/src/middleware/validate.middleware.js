import { ApiError } from '../utils/ApiError.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const message = result.error.issues.map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ');
      return next(new ApiError(400, message, 'VALIDATION_ERROR'));
    }
    req.body = result.data;
    return next();
  };
}
