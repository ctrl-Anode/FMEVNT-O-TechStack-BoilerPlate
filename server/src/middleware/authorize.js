import { ApiError } from '../utils/ApiError.js';
import { SUPER_PERMISSION } from '../config/constants.js';

export function authorize(...requiredPermissions) {
  return (req, _res, next) => {
    try {
      if (!req.user) throw ApiError.unauthorized();

      const granted = req.user.permissions || [];
      const allowed =
        granted.includes(SUPER_PERMISSION) ||
        requiredPermissions.every((permission) => granted.includes(permission));

      if (!allowed) {
        throw ApiError.forbidden(
          `Missing required permission(s): ${requiredPermissions.join(', ')}`
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export default authorize;
