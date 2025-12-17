import { z } from 'zod';

// Password requirements: min 8 chars, at least one uppercase, one lowercase, one number
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Email validation
const emailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters');

// Sign in schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Sign up schema with stronger validation
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  orgName: z
    .string()
    .trim()
    .min(2, 'Organisation name must be at least 2 characters')
    .max(200, 'Organisation name must be less than 200 characters'),
  orgAddress: z
    .string()
    .trim()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must be less than 500 characters'),
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;

// Validation helper function
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}