import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const env = parseEnv(readFileSync(`${root}.env.development.local`, 'utf8'));
export function localUrl(value) {
  const url = new URL(value);
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname), 'Los tests solo admiten HTTP en localhost');
  return url;
}
export const url = localUrl(env.SUPABASE_URL).origin;
assert.equal(localUrl(env.PUBLIC_SUPABASE_URL).origin, url, 'La web y los tests deben usar el mismo Supabase local');
assert.ok(env.SUPABASE_SERVICE_ROLE_KEY && env.PUBLIC_SUPABASE_ANON_KEY, 'Faltan las claves locales; consulta tests/README.md');
export const ok = ({ data, error }) => { assert.ifError(error); return data; };
export const hash = (token) => createHash('sha256').update(token).digest('hex');
const auth = { persistSession: false, autoRefreshToken: false };
const localFetch = (input, init) => {
  assert.equal(localUrl(typeof input === 'string' ? input : input.url).origin, url);
  return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(10000) });
};
export const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth, global: { fetch: localFetch } });
export const anon = () => createClient(url, env.PUBLIC_SUPABASE_ANON_KEY, { auth, global: { fetch: localFetch } });

export async function users() {
  const result = [];
  for (let page = 1; ; page++) {
    const batch = ok(await db.auth.admin.listUsers({ page, perPage: 1000 })).users;
    result.push(...batch);
    if (batch.length < 1000) return result;
  }
}

export async function login(user) {
  const client = anon();
  ok(await client.auth.signInWithPassword({ email: user.email, password: user.password }));
  return { client };
}

export async function redeem(token) {
  const response = await fetch(`${url}/functions/v1/mercado-invite`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: token }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, 'La función mercado-invite debe estar sirviéndose en local');
  return response.json();
}

export async function fixture(t) {
  ok(await db.from('mercado_invites').select('user_id,sent_at').limit(0));
  const prefix = `test-${randomBytes(6).toString('hex')}`;
  const emails = new Set();
  const occupied = new Set(ok(await db.from('mercado_attendance').select('marea')).map((r) => r.marea));
  const mareas = Array.from({ length: 200 }, (_, i) => String(999 - i)).filter((m) => !occupied.has(m)).slice(0, 2);
  assert.equal(mareas.length, 2, 'Hacen falta dos mareas libres entre 800 y 999');
  t.after(async () => {
    if (!emails.size) return;
    for (const user of (await users()).filter((u) => emails.has(u.email))) {
      const files = ok(await db.storage.from('mercado-fotos').list(user.id));
      if (files.length) ok(await db.storage.from('mercado-fotos').remove(files.map((f) => `${user.id}/${f.name}`)));
      ok(await db.auth.admin.deleteUser(user.id));
    }
    for (const table of ['mercado_invites', 'mercado_attendance', 'mercado_admins']) {
      ok(await db.from(table).delete().in('email', [...emails]));
    }
  });
  const email = (name) => { const value = `${prefix}-${name}@example.invalid`; emails.add(value); return value; };
  const user = async (name, { marea = mareas[0], admin = false } = {}) => {
    const address = email(name);
    if (admin) ok(await db.from('mercado_admins').insert({ email: address }));
    else ok(await db.from('mercado_attendance').insert({ email: address, marea }));
    const password = randomBytes(24).toString('hex');
    const { user: created } = ok(await db.auth.admin.createUser({ email: address, password, email_confirm: true }));
    return { id: created.id, email: address, password, name };
  };
  const profile = async (person, extra = {}) => ok(await db.from('mercado_profiles').upsert({
    id: person.id, name: person.name, website: 'https://example.org', ...extra,
  }));
  const invite = async (person, extra = {}) => {
    const token = randomBytes(32).toString('hex');
    ok(await db.from('mercado_invites').insert({
      token_hash: hash(token), user_id: person.id, email: person.email,
      expires_at: new Date(Date.now() + 86400000).toISOString(), sent_at: new Date().toISOString(), ...extra,
    }));
    return token;
  };
  return { email, user, profile, invite, mareas };
}
