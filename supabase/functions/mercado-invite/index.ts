// Canjea el botón de la invitación de El Mercado. Supabase solo tiene una caducidad para todos sus enlaces (1 hora), así que
// la invitación guarda su propio token (30 días, un solo uso) y el enlace de entrar se crea al canjearlo.
// Lo llama la página /mercado con un POST desde el navegador: así un filtro de correo que solo abre el enlace no lo gasta.
import { createClient } from 'npm:@supabase/supabase-js@2';

const site = Deno.env.get('MERCADO_SITE_URL') ?? 'https://atarazana.house';
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const reply = (body: Record<string, string | null>) => new Response(JSON.stringify(body), { headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const { t: token } = await req.json().catch(() => ({ t: '' }));
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return reply({ url: null, email: null });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  // Borrar y leer a la vez: el token solo se puede canjear una vez.
  const { data: invite } = await db.from('mercado_invites').delete().eq('token_hash', await sha256(token)).select('email, expires_at').maybeSingle();
  if (!invite) return reply({ url: null, email: null });
  if (new Date(invite.expires_at) < new Date()) return reply({ url: null, email: invite.email });

  const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email: invite.email, options: { redirectTo: `${site}/mercado` } });
  return error ? reply({ url: null, email: invite.email }) : reply({ url: data.properties.action_link, email: invite.email });
});
