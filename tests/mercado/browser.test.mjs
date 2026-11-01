import assert from 'node:assert/strict';
import test from 'node:test';
import { dev } from 'astro';
import { chromium } from 'playwright';
import { db, env, fixture, localUrl, ok, root } from '../helpers/local.mjs';

test('la invitación lleva al perfil, al directorio y al cierre de sesión, también a 360 px', { timeout: 60000 }, async (t) => {
  const f = await fixture(t);
  const me = await f.user('browser');
  const peer = await f.user('peer');
  const name = '<em>Nombre</em>';
  await f.profile(peer, { name });
  const token = await f.invite(me);
  // El servidor del test tiene su propio puerto y las mismas claves exclusivamente locales.
  process.env.PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL;
  process.env.PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY;
  const server = await dev({ root, server: { host: '127.0.0.1', port: 0 }, devToolbar: { enabled: false }, logLevel: 'error' });
  t.after(() => server.stop());
  const origin = `http://127.0.0.1:${server.address.port}`;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  await context.route('**/*', (route) => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Auth verifica el enlace de verdad. Solo adaptamos su redirección local al puerto libre del test.
  await page.route('**/auth/v1/verify?**', async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    assert.equal(response.status(), 303);
    const target = localUrl(response.headers().location);
    assert.equal(target.pathname, '/mercado');
    await route.fulfill({ response, headers: { ...response.headers(), location: origin + target.pathname + target.search + target.hash } });
  });
  await page.goto(`${origin}/mercado#invitacion=${token}`);
  await page.locator('[data-gate]:visible').waitFor();
  assert.equal(await page.locator('[data-browse]').isVisible(), false);
  await page.locator('[data-gate] a').click();
  await page.locator('[data-profile]:visible').waitFor();
  await page.locator('[name="name"]').fill('Persona de prueba');
  await page.locator('[name="website"]').fill('example.org');
  await page.locator('[data-save]').click();
  await page.waitForFunction(() => document.querySelector('[name="website"]')?.value === 'https://example.org/');
  assert.equal(ok(await db.from('mercado_profiles').select('name').eq('id', me.id).single()).name, 'Persona de prueba');
  await page.locator('.m-return').click();
  const peerLink = page.locator(`[data-grid] a[href$="id=${peer.id}"]`);
  await peerLink.waitFor();
  assert.equal(await peerLink.locator('.m-name').textContent(), name);
  assert.equal(await peerLink.locator('em').count(), 0, 'El texto de la BD nunca se interpreta como HTML');
  await peerLink.click();
  await page.locator('[data-state="person"]:visible').waitFor();
  assert.equal(await page.locator('[data-name]').textContent(), name);
  await page.goto(`${origin}/en/mercado`);
  await page.locator('[data-browse]:visible').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sin scroll horizontal a 360 px');
  await page.locator('[data-signout]').click();
  await page.locator('[data-state="login"]:visible').waitFor();
  assert.deepEqual(errors, [], 'Sin excepciones de JavaScript durante el recorrido');
});
