import { createClient } from '@supabase/supabase-js';

const entorno = import.meta.env ?? {};
const url = entorno.VITE_SUPABASE_URL?.trim();
const key = (entorno.VITE_SUPABASE_PUBLISHABLE_KEY ?? entorno.VITE_SUPABASE_ANON_KEY)?.trim();

export const supabaseConfigurado = Boolean(url && key);
export const supabase = supabaseConfigurado ? createClient(url, key) : null;

export function exigirSupabase() {
  if (!supabase) throw new Error('Supabase todavía no está configurado.');
  return supabase;
}
