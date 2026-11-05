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
    assert.equal(target.pathname, '/tripulacion');
    await route.fulfill({ response, headers: { ...response.headers(), location: origin + target.pathname + target.search + target.hash } });
  });
  await page.goto(`${origin}/tripulacion#invitacion=${token}`);
  await page.locator('[data-gate]:visible').waitFor();
  assert.equal(await page.locator('[data-browse]').isVisible(), false);
  await page.locator('[data-gate] a').click();
  await page.locator('[data-profile]:visible').waitFor();

  // Foto: una imagen roja a la izquierda y azul a la derecha, para saber qué parte queda dentro del encuadre.
  const image = (width, height, draw) => page.evaluate(async ({ width, height, draw }) => {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d');
    if (draw === 'noise') {
      const pixels = ctx.createImageData(width, height);
      for (let i = 0; i < pixels.data.length; i++) pixels.data[i] = i % 4 === 3 ? 255 : Math.random() * 256;
      ctx.putImageData(pixels, 0, 0);
    } else {
      ctx.fillStyle = '#f00'; ctx.fillRect(0, 0, width / 2, height);
      ctx.fillStyle = '#00f'; ctx.fillRect(width / 2, 0, width / 2, height);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, { width, height, draw });
  const pick = async (data, mimeType = 'image/png') => {
    await page.locator('[data-photo-input]').setInputFiles({ name: 'foto.png', mimeType, buffer: Buffer.from(data, 'base64') });
  };
  const edit = async (data) => { await pick(data); await page.locator('[data-photo-editor]:visible').waitFor(); };
  const stored = async () => {
    const files = ok(await db.storage.from('mercado-fotos').list(me.id));
    assert.equal(files.length, 1, 'La foto anterior sin guardar no se queda en el almacén');
    return files[0];
  };
  const use = async (previous) => {
    await page.locator('[data-photo-use]').click();
    await page.waitForFunction((old) => { const img = document.querySelector('[data-photo-preview] img'); return img?.complete && img.naturalWidth && !img.src.includes(old); }, previous ?? '~');
    return stored();
  };
  // Mira el resultado subido, no el lienzo: tamaño y color arriba, abajo, a izquierda y a derecha.
  const inspect = async (file) => {
    const blob = ok(await db.storage.from('mercado-fotos').download(`${me.id}/${file.name}`));
    const data = Buffer.from(await blob.arrayBuffer()).toString('base64');
    return page.evaluate(async (data) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const img = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
      const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const color = (x, y) => { const [r, , b] = ctx.getImageData(x, y, 1, 1).data; return r > b ? 'rojo' : 'azul'; };
      return { width: img.width, height: img.height, jpeg: bytes[0] === 0xff && bytes[1] === 0xd8, top: color(240, 10), bottom: color(240, 590), left: color(10, 300), right: color(470, 300) };
    }, data);
  };
  const halves = await image(1600, 800);

  await pick(Buffer.from('no es una imagen').toString('base64'));
  await page.locator('[data-photo-status]', { hasText: /\S/ }).waitFor();
  assert.equal(await page.locator('[data-photo-editor]').isVisible(), false, 'Un archivo que no es una imagen no abre el editor');

  await edit(halves);
  // Espera a que acabe la transición de página: mientras dura, el ratón no llega al lienzo.
  await page.locator('[data-photo-editor] canvas').click({ trial: true });
  const box = await page.locator('[data-photo-editor] canvas').boundingBox();
  assert.ok(box.x + box.width <= 360, 'El editor cabe a 360 px');
  await page.mouse.move(box.x + 20, box.y + 150);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 150, { steps: 5 });
  await page.mouse.up();
  let file = await use();
  assert.deepEqual(await inspect(file), { width: 480, height: 600, jpeg: true, top: 'rojo', bottom: 'rojo', left: 'rojo', right: 'rojo' }, 'Arrastrar elige la parte izquierda');

  await edit(halves);
  await page.locator('[data-photo-rotate]').click();
  const rotated = await use(file.name);
  const turned = await inspect(rotated);
  assert.deepEqual([turned.top, turned.bottom], ['rojo', 'azul'], 'Girar a la derecha lleva la izquierda arriba');

  await edit(halves);
  await page.locator('[data-photo-zoom]').fill('4');
  const zoomed = await use(rotated.name);
  const center = await inspect(zoomed);
  assert.deepEqual([center.left, center.right], ['rojo', 'azul'], 'El zoom mantiene el centro');

  await edit(halves);
  await page.locator('[data-photo-cancel]').click();
  assert.equal((await stored()).name, zoomed.name, 'Cancelar no cambia la foto');

  await edit(await image(480, 600, 'noise'));
  const heavy = await use(zoomed.name);
  assert.ok(heavy.metadata.size <= 200 * 1024, `Foto de ${heavy.metadata.size} bytes`);

  // Guardar con la subida en curso espera a que acabe, o el perfil se quedaría sin la foto nueva.
  const savedRow = async () => (await db.from('mercado_profiles').select('name, photo').eq('id', me.id).maybeSingle()).data;
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let uploading;
  const started = new Promise((resolve) => { uploading = resolve; });
  await page.route('**/storage/v1/object/mercado-fotos/**', async (route) => {
    if (route.request().method() === 'POST') { uploading(); await held; }
    await route.fallback();
  });
  await page.locator('[name="name"]').fill('Persona de prueba');
  await page.locator('[name="website"]').fill('example.org');
  await edit(halves);
  await page.locator('[data-photo-use]').click();
  await started;
  assert.equal(await page.locator('[data-photo-label]').isVisible(), false, 'No se elige otra foto con la subida en curso');
  assert.equal(await page.locator('[data-photo-remove]').isVisible(), false, 'No se quita la foto con la subida en curso');
  await page.locator('[data-save]').click();
  await page.locator('[data-status]', { hasText: /Guardando/ }).waitFor();
  assert.equal(await savedRow(), null, 'No se guarda el perfil antes de acabar la subida');
  release();
  await page.waitForFunction(() => document.querySelector('[name="website"]')?.value === 'https://example.org/');
  await page.unroute('**/storage/v1/object/mercado-fotos/**');
  const uploaded = await stored();
  assert.notEqual(uploaded.name, heavy.name);
  assert.deepEqual(await savedRow(), { name: 'Persona de prueba', photo: `${me.id}/${uploaded.name}` }, 'El perfil guarda la foto recién subida');

  // Pasó en un iPhone: eligió foto, no pulsó «Usar foto» y «Guardar» no hacía nada. Ahora usa la foto como está.
  await edit(halves);
  await page.locator('[data-save]').click();
  await page.locator('[data-status]', { hasText: /Guardado/ }).waitFor();
  assert.equal(await page.locator('[data-photo-editor]').isVisible(), false, 'Guardar cierra el editor');
  const framed = await stored();
  assert.notEqual(framed.name, uploaded.name);
  assert.equal((await savedRow()).photo, `${me.id}/${framed.name}`, 'Guardar con el editor abierto guarda la foto encuadrada');
  await page.locator('.m-return').click();
  const peerLink = page.locator(`[data-grid] a[href$="id=${peer.id}"]`);
  await peerLink.waitFor();
  assert.equal(await peerLink.locator('.m-name').textContent(), name);
  assert.equal(await peerLink.locator('em').count(), 0, 'El texto de la BD nunca se interpreta como HTML');
  const selfCard = page.locator('[data-grid] li').first();
  assert.equal(await selfCard.locator('.m-name').textContent(), 'Persona de prueba', 'Tu perfil sale el primero del directorio');
  assert.equal(await selfCard.locator('.m-self').textContent(), 'Tú');
  assert.equal(await peerLink.locator('.m-self').count(), 0);
  await peerLink.click();
  await page.locator('[data-state="person"]:visible').waitFor();
  assert.equal(await page.locator('[data-name]').textContent(), name);
  await page.goto(`${origin}/en/tripulacion`);
  await page.locator('[data-browse]:visible').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sin scroll horizontal a 360 px');
  await page.locator('[data-signout]').click();
  await page.locator('[data-state="login"]:visible').waitFor();
  assert.deepEqual(errors, [], 'Sin excepciones de JavaScript durante el recorrido');
});
