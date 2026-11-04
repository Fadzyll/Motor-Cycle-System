import { z } from 'zod'

export const emailField = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))

export const passwordField = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use letters and at least one number')

/** Supabase sends 6–10 digit codes depending on the project's "Email OTP Length" setting. */
export const codeField = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/, 'Enter the full code from the email')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password'),
})

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter your name').max(60),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const resetSchema = z
  .object({
    code: codeField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

/** Field name → first error message. */
export function errorsByField(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
