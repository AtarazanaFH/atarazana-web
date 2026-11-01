import assert from 'node:assert/strict';
import test from 'node:test';
import { anon, db, fixture, localUrl, ok, redeem, users } from '../helpers/local.mjs';

test('la invitación abre una sesión una sola vez y se revoca al caducar, rellenar el perfil o borrar la cuenta', { timeout: 30000 }, async (t) => {
  const f = await fixture(t);
  const person = await f.user('invited');
  const token = await f.invite(person);
  assert.ok((await anon().from('mercado_invites').select('*')).error, 'El navegador no puede leer tokens');

  const results = await Promise.all([redeem(token), redeem(token)]);
  assert.equal(results.filter((r) => r.url).length, 1, 'Dos peticiones simultáneas no pueden canjear el mismo token');
  const link = results.find((r) => r.url).url;
  const response = await fetch(localUrl(link), { redirect: 'manual' });
  assert.equal(response.status, 303);
  const params = new URLSearchParams(localUrl(response.headers.get('location')).hash.slice(1));
  const client = anon();
  const session = ok(await client.auth.setSession({ access_token: params.get('access_token'), refresh_token: params.get('refresh_token') }));
  assert.equal(session.user.id, person.id, 'El enlace debe autenticar a su destinatario');

  assert.equal((await redeem(await f.invite(person, { expires_at: '2000-01-01T00:00:00Z' }))).url, null, 'Un token caducado no autentica');
  const beforeProfile = await f.invite(person);
  await f.profile(person);
  assert.equal((await redeem(beforeProfile)).url, null, 'Rellenar el perfil revoca los tokens pendientes');

  const removed = await f.user('removed');
  const beforeDeletion = await f.invite(removed);
  ok(await db.auth.admin.deleteUser(removed.id));
  assert.equal((await redeem(beforeDeletion)).url, null, 'Borrar la cuenta debe revocar su invitación aunque conserve la asistencia');
  assert.ok(!(await users()).some((u) => u.email === removed.email), 'El canje no puede recrear una cuenta borrada');
});
