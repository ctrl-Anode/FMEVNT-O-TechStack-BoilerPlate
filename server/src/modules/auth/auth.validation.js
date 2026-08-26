import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../../config/constants.js';

export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const nameField = z.string().trim().min(2).max(50);

export const registerSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  email: z.string().trim().toLowerCase().email(),
  password: passwordField
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32).max(128)
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: passwordField
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(10),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordField
});

export const mfaCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/)
});

export const disableMfaSchema = z.object({
  password: z.string().min(1),
  code: z.string().regex(/^\d{6}$/)
});
