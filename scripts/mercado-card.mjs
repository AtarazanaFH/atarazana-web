// Tarjeta de invitación de la Tripulación: la misma de la portada, como JPEG, con el correo de cada persona.
// La pinta Chromium con los estilos de la web. Hace falta una vez: npx playwright install chromium-headless-shell
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const root = new URL('..', import.meta.url).pathname;
const font = (family, file, weight) => `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(`${root}node_modules/${file}`).toString('base64')}) format('woff2')}`;
const fonts = [
  font('Anton', '@fontsource/anton/files/anton-latin-400-normal.woff2', 400),
  font('Inter Variable', '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', '100 900'),
  font('IBM Plex Mono', '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2', 500),
  font('IBM Plex Mono', '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2', 700),
  font('Permanent Marker', '@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2', 400),
].join('');
const css = readFileSync(`${root}src/styles/global.css`, 'utf8');
const logo = readFileSync(`${root}src/components/Logo.astro`, 'utf8').match(/<svg.*<\/svg>/s)[0].replace('class={className}', 'class="pass-mark"');
const code = readFileSync(`${root}src/pages/index.astro`, 'utf8').match(/<svg class="pass-code".*?<\/svg>/s)[0];

const page = `<!doctype html><meta charset="utf-8"><style>${fonts}${css}
html,body{margin:0;background:#0a1d22}
.hero-pass{width:560px;min-height:0;height:540px;margin:0;box-sizing:border-box;border:0;padding:64px 24px 28px}
.pass-name b{white-space:nowrap;min-width:0;line-height:1.2;color:var(--deep)}
</style>
<figure class="hero-pass"><div class="pass"><div class="pass-slot"></div><div class="pass-top"><span>Invitación</span><span>Personal</span></div>
<div class="pass-body">${logo}<p class="pass-title">Atarazana<br>Founder House</p>
<dl class="pass-data"><div><dt>Lugar</dt><dd>La Tripulación</dd></div><div><dt>Ciudad</dt><dd>Málaga</dd></div><div><dt>Acceso</dt><dd>Privado</dd></div><div><dt>Plaza</dt><dd>La tuya</dd></div></dl>
<p class="pass-name"><span>Para</span><b data-to></b></p></div><div class="pass-foot">${code}</div></div></figure>`;

let browser;
let tab;

// Se llama antes de crear ninguna cuenta: si falta el navegador, mejor enterarse aquí.
export async function openCard() {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 560, height: 540 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  tab = await context.newPage();
  await tab.setContent(page);
  // La fuente de la línea "Para" no se usa hasta poner un correo: hay que cargarla antes de medir.
  await tab.evaluate(async () => { await document.fonts.load('26px "Permanent Marker"', 'a@b.c'); await document.fonts.ready; });
}

export async function renderCard(email) {
  await tab.evaluate((text) => {
    const el = document.querySelector('[data-to]');
    el.textContent = text;
    // los correos largos se encogen para caber en la línea
    let size = 26;
    el.style.fontSize = `${size}px`;
    while (el.scrollWidth > el.clientWidth && size > 9) { size -= 0.5; el.style.fontSize = `${size}px`; }
  }, email);
  await tab.evaluate(() => document.fonts.ready);
  return tab.screenshot({ type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 560, height: 540 } });
}

export async function closeCard() { await browser?.close(); }
