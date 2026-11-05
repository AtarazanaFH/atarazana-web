import assert from 'node:assert/strict';
import test from 'node:test';
import { db, fixture, localUrl, ok, redeem, users } from '../helpers/local.mjs';
import { importer } from '../helpers/importer.mjs';

test('importar respeta el check-in, recupera fallos de BD y SMTP y no duplica envíos', { timeout: 60000 }, async (t) => {
  const f = await fixture(t);
  const address = f.email('attendee'), absent = f.email('absent'), rejected = f.email('rejected');
  const { run, state } = await importer(t, f.mareas[0], [
    'email,name,approval_status,checked_in_at',
    `${address.toUpperCase()},"Nombre, con coma",approved,2026-11-01`,
    `${address},Duplicado,approved,2026-11-01`,
    `${absent},Ausente,approved,`,
    `${rejected},Rechazado,declined,2026-11-01`,
  ].join('\n'));
  const execute = async (options, expected) => {
    const result = await run(options);
    assert.equal(result.code, expected, result.output);
  };
  const invitations = async () => ok(await db.from('mercado_invites').select('*').eq('email', address));
  await execute({ dryRun: true }, 0);
  assert.deepEqual(ok(await db.from('mercado_attendance').select('*').eq('marea', f.mareas[0])), [], 'dry-run no escribe');
  assert.equal(state.attempts, 0);

  await execute({ failInsert: true }, 1); // Cuenta creada, aún sin token: también debe recuperarse.
  assert.equal(state.attempts, 0);
  await execute({}, 1); // La base de datos vuelve, SMTP falla.
  assert.equal(state.attempts, 1);
  const [pending] = await invitations();
  assert.equal(pending.sent_at, null);
  await execute({ failInsert: true }, 1); // Un reintento fallido no puede perder el pendiente anterior.
  assert.equal((await invitations())[0]?.token_hash, pending.token_hash);

  state.reject = false;
  await execute({}, 0);
  const [sent] = await invitations();
  assert.ok(sent.sent_at);
  assert.equal((await invitations()).length, 1);
  assert.notEqual(sent.token_hash, pending.token_hash);
  assert.equal(state.delivered, 1);
  await execute({}, 0);
  assert.equal(state.attempts, 2, 'Reimportar no vuelve a mandar una invitación enviada');
  assert.deepEqual(ok(await db.from('mercado_attendance').select('email').eq('marea', f.mareas[0])).map((r) => r.email), [address]);
  assert.ok(!(await users()).some((u) => [absent, rejected].includes(u.email)), 'No se crean cuentas de ausentes ni rechazados');

  // El token se borra al entrar. last_sign_in_at debe evitar que eso provoque otro envío.
  const person = (await users()).find((u) => u.email === address);
  const token = await f.invite(person);
  const { url } = await redeem(token);
  const response = await fetch(localUrl(url), { redirect: 'manual' });
  assert.equal(response.status, 303);
  ok(await db.from('mercado_invites').delete().eq('user_id', person.id));
  await execute({}, 0);
  assert.equal(state.attempts, 2, 'Haber entrado sin dejar tokens no convierte la cuenta en pendiente');
});

test('--no-invite carga sin mandar nada y una errata en la opción no escribe ni envía', { timeout: 60000 }, async (t) => {
  const f = await fixture(t);
  const address = f.email('attendee');
  const { run, state } = await importer(t, f.mareas[0], `email,name,approval_status,checked_in_at\n${address},Asistente,approved,2026-11-01\n`);
  state.reject = false;
  const attendance = async () => ok(await db.from('mercado_attendance').select('email').eq('marea', f.mareas[0])).map((r) => r.email);
  const account = async () => (await users()).find((u) => u.email === address);

  const typo = await run({ flags: ['--no-invites'] });
  assert.equal(typo.code, 1, typo.output);
  assert.deepEqual(await attendance(), [], 'Una opción desconocida no escribe');
  assert.equal(await account(), undefined);
  assert.equal(state.attempts, 0, 'Una opción desconocida no envía');

  const loaded = await run({ flags: ['--no-invite'] });
  assert.equal(loaded.code, 0, loaded.output);
  assert.deepEqual(await attendance(), [address]);
  assert.equal(await account(), undefined, '--no-invite no crea cuentas');
  assert.deepEqual(ok(await db.from('mercado_invites').select('*').eq('email', address)), []);
  assert.equal(state.attempts, 0, '--no-invite no envía');

  const invited = await run();
  assert.equal(invited.code, 0, invited.output);
  assert.equal(state.delivered, 1, 'Repetir sin la opción manda la invitación pendiente');
  assert.ok((await account())?.id);
  const [invite] = ok(await db.from('mercado_invites').select('*').eq('email', address));
  assert.ok(invite?.sent_at);
  assert.deepEqual(await attendance(), [address], 'Repetir no duplica la asistencia');
});
