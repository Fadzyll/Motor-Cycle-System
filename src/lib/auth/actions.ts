import { supabase } from '@/lib/supabase'

/** Sends a 6-digit sign-in code to the email (creates the account on first use). */
export async function sendEmailCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

export async function verifyEmailCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
