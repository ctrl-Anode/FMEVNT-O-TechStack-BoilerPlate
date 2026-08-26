import { ApiError } from '../utils/ApiError.js';

export function validate(schemas) {
  return (req, _res, next) => {
    try {
      const failures = [];

      for (const part of ['params', 'query', 'body']) {
        const schema = schemas[part];
        if (!schema) continue;

        const result = schema.safeParse(req[part]);
        if (result.success) {
          if (part === 'body') req.body = result.data;
          if (part === 'query') req.query = result.data;
        } else {
          const fields = {};
          for (const issue of result.error.issues) {
            const key = issue.path.join('.') || '_';
            if (!fields[key]) fields[key] = issue.message;
          }
          failures.push(fields);
        }
      }

      if (failures.length > 0) {
        throw ApiError.unprocessable('Validation failed', Object.assign({}, ...failures));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export default validate;
