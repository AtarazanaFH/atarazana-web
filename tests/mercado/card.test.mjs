import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { openCard, renderCard, closeCard } from '../../scripts/mercado-card.mjs';

test('el correo cabe desde la primera tarjeta, con la fuente real cargada', { timeout: 15000 }, async (t) => {
  const launch = chromium.launch.bind(chromium);
  let browser;
  t.mock.method(chromium, 'launch', async (...args) => { browser = await launch(...args); return browser; });
  t.after(closeCard);
  await openCard();
  // La segunda pasada no debe esconder una medición incorrecta de la primera.
  for (let pass = 1; pass <= 2; pass++) {
    await renderCard('review@example.com');
    const metrics = await browser.contexts()[0].pages()[0].locator('[data-to]').evaluate((el) => ({
      text: el.textContent, width: el.clientWidth, content: el.scrollWidth,
      loaded: document.fonts.check('26px "Permanent Marker"'),
    }));
    assert.equal(metrics.text, 'review@example.com');
    assert.ok(metrics.loaded, `Fuente sin cargar en la tarjeta ${pass}`);
    assert.ok(metrics.content <= metrics.width, `Desborda la tarjeta ${pass}: ${metrics.content} > ${metrics.width}`);
  }
});
