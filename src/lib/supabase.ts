import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Clave pública (anon): es segura en el navegador porque todo pasa por las reglas de supabase/schema.sql.
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Producción se cuida: con `npm run dev` solo se habla con el Supabase local, y la web publicada nunca con el local.
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url ?? '');
const allowed = import.meta.env.DEV === isLocal;
if (url && !allowed) {
  console.warn(import.meta.env.DEV
    ? `El Mercado: en local solo se usa el Supabase local, no ${url}. Revisa .env.development.local.`
    : 'El Mercado: esta build apunta al Supabase local; no se conecta.');
}

let client: SupabaseClient | null = null;

export function supabase() {
  if (!url || !key || !allowed) return null;
  // implicit: los enlaces de invitación los genera el servidor, así que no pueden usar PKCE
  client ??= createClient(url, key, { auth: { flowType: 'implicit', persistSession: true, detectSessionInUrl: true } });
  return client;
}

export const PHOTO_BUCKET = 'mercado-fotos';
