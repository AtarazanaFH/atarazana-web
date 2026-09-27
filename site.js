/* Atarazana House · interacciones pequeñas y mecánicas */

/* Cursor propio: un punto blanco que crece sobre lo que se puede pulsar y hace una onda al hacer clic.
   Solo con ratón; en pantallas táctiles se queda el comportamiento nativo. */
(() => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<i></i>';
  document.body.appendChild(cursor);
  document.documentElement.classList.add('has-cursor');

  const interactive = 'a, button, [role="button"], label, summary';

  window.addEventListener('pointermove', (e) => {
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    cursor.classList.add('is-visible');
    cursor.classList.toggle('is-link', !!e.target.closest(interactive));
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  window.addEventListener('pointerdown', (e) => {
    cursor.classList.add('is-down');
    const ripple = document.createElement('span');
    ripple.className = 'cursor-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    setTimeout(() => ripple.remove(), 800); // por si la animación está desactivada
  });
  window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
})();

/* Perfiles de "Para quién es": si la descripción se sale por la derecha, se alinea al otro lado. */
(() => {
  const place = (li) => {
    const tip = li.querySelector('.aud-desc');
    if (!tip) return;
    li.classList.remove('flip');
    const limit = li.closest('.wrap').getBoundingClientRect().right;
    if (tip.getBoundingClientRect().right > limit) li.classList.add('flip');
  };
  document.querySelectorAll('.audience li').forEach((li) => {
    li.addEventListener('pointerenter', () => place(li));
    li.addEventListener('focusin', () => place(li));
  });
})();

/* Flechas: apuntan siempre al botón de "Solicita invitación" visible más cercano
   (o al más cercano de la página si no hay ninguno en pantalla) y se reorientan al hacer scroll. */
(() => {
  const pointers = [...document.querySelectorAll('.pointer')];
  if (!pointers.length) return;
  const ctas = [...document.querySelectorAll('a[href*="luma.com"].cta, .nav-cta')];

  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const onScreen = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;

  const update = () => {
    const all = ctas.map((el) => el.getBoundingClientRect()).filter((r) => r.width);
    const visible = all.filter(onScreen);
    pointers.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!onScreen(r)) return;
      const c = center(r);
      let best = null, bestDist = Infinity;
      // si no hay ningún botón en pantalla, señala al más cercano en la página (arriba o abajo)
      for (const t of visible.length ? visible : all) {
        const tc = center(t);
        const d = Math.hypot(tc.x - c.x, tc.y - c.y);
        if (d < bestDist) { bestDist = d; best = tc; }
      }
      if (!best) return;
      let angle = Math.atan2(best.y - c.y, best.x - c.x) * 180 / Math.PI;
      // gira por el camino corto en vez de dar la vuelta entera al cruzar ±180°
      const prev = el._angle ?? -45;
      angle += Math.round((prev - angle) / 360) * 360;
      el._angle = angle;
      el.style.setProperty('--angle', `${angle}deg`);
    });
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('load', update);
  update();
})();
