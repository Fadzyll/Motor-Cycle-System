import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Email + password accounts.
 * - Register → Supabase emails a code ("Confirm sign up" template) → verifySignupCode activates the account.
 * - Login is email + password only.
 * - Forgot password → code ("Reset password" template) → new password.
 */

/**
 * True after the user taps "Sign out", so the next sign-in starts at the dashboard
 * instead of returning to the page they signed out from. (A session that simply
 * expires still returns the user to where they were.)
 */
let signedOutByUser = false
export const wasSignedOutByUser = () => signedOutByUser

export class EmailNotConfirmedError extends Error {
  constructor() {
    super('Your account is not activated yet. Enter the code we emailed you.')
  }
}

export class AccountExistsError extends Error {
  constructor() {
    super('An account with this email already exists. Sign in, or use "Forgot password?".')
  }
}

function friendly(error: AuthError): Error {
  const code = error.code ?? ''
  if (code === 'invalid_credentials') return new Error('Wrong email or password.')
  if (code === 'email_not_confirmed') return new EmailNotConfirmedError()
  if (code === 'user_already_exists') return new AccountExistsError()
  if (code === 'otp_expired') return new Error('That code is wrong or has expired. Request a new one.')
  if (code === 'weak_password') return new Error(error.message || 'Choose a stronger password.')
  if (code === 'over_email_send_rate_limit' || error.status === 429)
    return new Error('Too many emails were sent. Wait a minute and try again.')
  if (code === 'same_password') return new Error('The new password must be different from the old one.')
  return new Error(error.message)
}

export async function registerAccount(input: { name: string; email: string; password: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.name } },
  })
  if (error) throw friendly(error)
  // Supabase hides whether an email is registered: for an existing confirmed account it
  // returns a user with no identities and sends nothing.
  if (data.user && data.user.identities?.length === 0) throw new AccountExistsError()
}

/** Activates the account with the emailed code (this also signs the user in). */
export async function verifySignupCode(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
  if (error) throw friendly(error)
  // Copy the name given at registration into the profile.
  const name = data.user?.user_metadata?.display_name
  if (data.user && typeof name === 'string' && name) {
    await supabase.from('profiles').update({ display_name: name }).eq('id', data.user.id)
  }
}

export async function resendSignupCode(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) throw friendly(error)
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw friendly(error)
}

/** Emails a password-reset code. */
export async function sendPasswordResetCode(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw friendly(error)
}

/** Checks the reset code (signs the user in), then sets the new password. */
export async function resetPassword(email: string, token: string, newPassword: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' })
  if (error) throw friendly(error)
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) throw friendly(updateError)
}

export async function signOut() {
  signedOutByUser = true
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
