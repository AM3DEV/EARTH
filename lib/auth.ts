import { supabase } from './supabase';

/** Resolve username -> email server-side via RPC, then sign in. Never expose emails client-side. */
export async function signInWithEmailOrUsername(identifier: string, password: string) {
  const id = identifier.trim();
  if (id.includes('@')) {
    return supabase.auth.signInWithPassword({ email: id.toLowerCase(), password });
  }
  const { data, error } = await supabase.rpc('resolve_login_email', { p_username: id });
  if (error || !data) throw error ?? new Error('Invalid credentials');
  return supabase.auth.signInWithPassword({ email: data as string, password });
}

export async function signUpTourist(input: {
  firstName: string; lastName: string; email: string; username: string; password: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.toLowerCase().trim(),
    password: input.password,
    options: { data: { first_name: input.firstName.trim(), last_name: input.lastName.trim(), username: input.username.trim() } },
  });
  if (error) throw error;
  return data;
}

export async function getMyRole(): Promise<'user' | 'admin' | 'boss_admin'> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'user';
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  return (data?.role as any) ?? 'user';
}
