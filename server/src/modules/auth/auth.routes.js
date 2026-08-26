import { Router } from 'express';
import * as controller from './auth.controller.js';
import * as v from './auth.validation.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate({ body: v.registerSchema }),
  /* @openapi
    POST /auth/register
    tags: [Auth]
    summary: Register a new account
    security: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [firstName, lastName, email, password]
            properties:
              firstName: { type: string, minLength: 2 }
              lastName: { type: string, minLength: 2 }
              email: { type: string, format: email }
              password: { type: string, minLength: 10 }
    responses:
      201: { description: Account created with token pair }
      409: { $ref: '#/components/responses/Conflict' }
      422: { $ref: '#/components/responses/ValidationError' }
  */
  controller.register
);

router.post(
  '/login',
  authLimiter,
  validate({ body: v.loginSchema }),
  /* @openapi
    POST /auth/login
    tags: [Auth]
    summary: Sign in with email and password (returns mfaRequired when MFA is enabled)
    security: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [email, password]
            properties:
              email: { type: string, format: email }
              password: { type: string }
    responses:
      200: { description: Token pair or MFA challenge }
      401: { description: Invalid credentials }
      403: { description: Account suspended/inactive }
  */
  controller.login
);

router.post(
  '/mfa/verify',
  authLimiter,
  validate({ body: v.mfaVerifySchema }),
  /* @openapi
    POST /auth/mfa/verify
    tags: [Auth]
    summary: Complete login with a TOTP code from the MFA challenge
    security: []
    responses:
      200: { description: Token pair }
      401: { description: Invalid code or expired challenge }
  */
  controller.verifyMfa
);

router.post(
  '/refresh',
  validate({ body: v.refreshTokenSchema }),
  /* @openapi
    POST /auth/refresh
    tags: [Auth]
    summary: Rotate refresh token and receive a new token pair
    security: []
    responses:
      200: { description: New token pair }
      401: { description: Refresh token invalid/expired/revoked }
  */
  controller.refresh
);

router.post(
  '/logout',
  authenticate,
  validate({ body: v.refreshTokenSchema.partial().optional() }),
  /* @openapi
    POST /auth/logout
    tags: [Auth]
    summary: Revoke the provided refresh token session
    security: [{ bearerAuth: [] }]
    responses:
      200: { description: Logged out }
  */
  controller.logout
);

router.post(
  '/logout-all',
  authenticate,
  /* @openapi
    POST /auth/logout-all
    tags: [Auth]
    summary: Revoke every active session for the current user
    security: [{ bearerAuth: [] }]
    responses:
      200: { description: All sessions revoked }
  */
  controller.logoutAll
);

router.get(
  '/me',
  authenticate,
  /* @openapi
    GET /auth/me
    tags: [Auth]
    summary: Current user profile with roles and permissions
    security: [{ bearerAuth: [] }]
    responses:
      200: { description: Current user }
  */
  controller.me
);

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: v.forgotPasswordSchema }),
  /* @openapi
    POST /auth/forgot-password
    tags: [Auth]
    summary: Request a password reset email (always succeeds)
    security: []
    responses:
      200: { description: Queued }
  */
  controller.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: v.resetPasswordSchema }),
  /* @openapi
    POST /auth/reset-password
    tags: [Auth]
    summary: Consume a reset token and set a new password
    security: []
    responses:
      200: { description: Password updated, all sessions revoked }
      400: { description: Token invalid or expired }
  */
  controller.resetPassword
);

router.patch(
  '/password',
  authenticate,
  validate({ body: v.changePasswordSchema }),
  /* @openapi
    PATCH /auth/password
    tags: [Auth]
    summary: Change own password (revokes all other sessions)
    security: [{ bearerAuth: [] }]
    responses:
      200: { description: Password changed }
      400: { description: Current password incorrect }
  */
  controller.changePassword
);

router.post(
  '/mfa/setup',
  authenticate,
  /* @openapi
    POST /auth/mfa/setup
    tags: [Auth]
    summary: Begin TOTP enrollment, returns secret + otpauth URI
    security: [{ bearerAuth: [] }]
    responses:
      200: { description: Secret generated }
      409: { description: Already enabled }
  */
  controller.setupMfa
);

router.post(
  '/mfa/confirm',
  authenticate,
  validate({ body: v.mfaCodeSchema }),
  /* @openapi
    POST /auth/mfa/confirm
    tags: [Auth]
    summary: Activate MFA by confirming the first TOTP code
    security: [{ bearerAuth: [] }]
    responses:
      200: { description: MFA enabled }
      400: { description: Invalid code }
  */
  controller.confirmMfa
);

router.post(
  '/mfa/disable',
  authenticate,
  validate({ body: v.disableMfaSchema }),
  /* @openapi
    POST /auth/mfa/disable
    tags: [Auth]
    summary: Disable MFA (requires password + valid TOTP code)
    security: [{ bearerAuth: [] }]
    responses:
      200: { description: MFA disabled }
  */
  controller.disableMfa
);

export default router;
