import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fixture, root } from '../helpers/local.mjs';
import { command } from '../helpers/importer.mjs';

test('migrar conserva los envíos antiguos y reaplicar el esquema no marca pendientes como enviados', { timeout: 30000 }, async (t) => {
  const f = await fixture(t);
  const person = await f.user('legacy');
  const schema = await readFile(`${root}supabase/schema.sql`, 'utf8');
  // Tabla anterior al arreglo. Todo, incluido el DDL del esquema real, se revierte con ROLLBACK.
  const sql = `
    begin;
    set local lock_timeout = '3s';
    set local statement_timeout = '10s';
    drop table public.mercado_invites;
    create table public.mercado_invites (
      token_hash text primary key, email text not null,
      expires_at timestamptz not null, created_at timestamptz not null default now()
    );
    insert into public.mercado_invites values (repeat('a', 64), '${person.email}', now() + interval '30 days', now());
    ${schema}
    do $$ begin
      if not exists (select 1 from public.mercado_invites where token_hash = repeat('a', 64) and user_id = '${person.id}' and sent_at is not null)
        then raise exception 'La invitación antigua debe conservarse como enviada'; end if;
    end $$;
    insert into public.mercado_invites (token_hash, user_id, email, expires_at)
      values (repeat('b', 64), '${person.id}', '${person.email}', now() + interval '30 days');
    ${schema}
    do $$ begin
      if not exists (select 1 from public.mercado_invites where token_hash = repeat('b', 64) and sent_at is null)
        then raise exception 'Reaplicar el esquema no debe perder los reintentos pendientes'; end if;
    end $$;
    rollback;
  `;
  const result = await command('docker', ['--host', 'unix:///var/run/docker.sock', 'exec', '-i', 'supabase_db_atarazana-web',
    'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {}, sql);
  assert.equal(result.code, 0, result.output);
});
