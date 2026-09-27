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

  const interactive = 'a, button, [role="button"], label, summary, .has-physics .pass';

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

/* Flechas: apuntan siempre al botón rojo "Solicita invitación" del menú
   y se reorientan al hacer scroll o cambiar el tamaño de la ventana. */
(() => {
  const target = document.querySelector('.nav-cta');
  if (!target) return;
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
    + 'stroke-linecap="butt" stroke-linejoin="miter"><path d="M14 5l7 7-7 7M2 12h18"/></svg>';

  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

  const aim = () => {
    const t = center(target.getBoundingClientRect());
    // la zona visible empieza bajo la cabecera: una flecha tapada por ella no se toca,
    // así no da la vuelta al pasar por encima del botón
    const top = target.closest('header')?.getBoundingClientRect().bottom ?? 0;
    document.querySelectorAll('.pointer').forEach((el) => {
      const c = center(el.getBoundingClientRect());
      if (c.y < top || c.y > innerHeight) return;
      let angle = Math.atan2(t.y - c.y, t.x - c.x) * 180 / Math.PI;
      // gira por el camino corto en vez de dar la vuelta entera al cruzar ±180°
      const prev = el._angle ?? -45;
      angle += Math.round((prev - angle) / 360) * 360;
      el._angle = angle;
      el.style.setProperty('--angle', `${angle}deg`);
    });
  };

  /* Campo de flechas del bloque rojo: una retícula regular que rellena los huecos
     que deja el texto, como un mapa de gradiente que se inclina hacia el botón. */
  const field = document.querySelector('.field');
  const buildField = () => {
    if (!field) return;
    const wrap = field.parentElement;
    const box = wrap.getBoundingClientRect();
    const gap = Math.max(64, Math.min(120, box.width / 11));  // distancia entre flechas
    const size = Math.round(gap * 0.42);
    const margin = size * 0.35;

    // zonas ocupadas por el texto, línea a línea
    const blocked = [];
    wrap.querySelectorAll('p').forEach((p) => {
      const range = document.createRange();
      range.selectNodeContents(p);
      for (const r of range.getClientRects()) blocked.push(r);
    });
    const hits = (x, y) => blocked.some((r) =>
      x + size / 2 + margin > r.left && x - size / 2 - margin < r.right &&
      y + size / 2 + margin > r.top && y - size / 2 - margin < r.bottom);

    field.textContent = '';
    const cols = Math.floor(box.width / gap), rows = Math.floor(box.height / gap);
    const offX = (box.width - (cols - 1) * gap) / 2, offY = (box.height - (rows - 1) * gap) / 2;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = offX + i * gap, y = offY + j * gap;
        if (hits(box.left + x, box.top + y)) continue;
        const el = document.createElement('span');
        el.className = 'pointer';
        el.innerHTML = ARROW;
        el.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px`;
        field.appendChild(el);
      }
    }
    wrap.parentElement.classList.toggle('has-field', field.children.length > 0);
    aim();
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; aim(); });
  };
  let resizeTimer;
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(buildField, 150); });
  // el hueco depende de la tipografía: se recalcula cuando carga
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(buildField);
  addEventListener('load', buildField);
  buildField();
})();

/* Pase de la portada: péndulo colgado de su cinta.
   Se balancea con una brisa suave, reacciona al rozarlo con el cursor y al hacer scroll,
   y se puede agarrar y lanzar con ratón o con el dedo. */
(() => {
  const figure = document.querySelector('.hero-pass');
  const card = figure && figure.querySelector('.pass');
  if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  figure.classList.add('has-physics');
  card.style.animation = 'none';

  const REST = -0.05;      // rad: reposa un pelín torcida, como una cinta con un giro
  const DAMPING = 2.4;     // rozamiento del aire: se estabiliza en pocos vaivenes
  const MAX = 0.9;         // rad: tope para que no se salga demasiado del marco
  let g = 30;              // g / L, se recalcula con el largo real de la cinta

  let theta = -0.28, omega = 0;   // entra balanceándose
  let y = -30, vy = 0;            // y cae un poco, con rebote de la cinta
  let pivot = { x: 0, y: 0 };
  let dragging = null;
  let running = false, visible = true, last = 0, t = 0;

  const measure = () => {
    // el punto de giro está donde la cinta sale del borde superior del marco
    const f = figure.getBoundingClientRect();
    const top = card.offsetTop;
    card.style.transformOrigin = `50% ${-top}px`;
    const length = top + card.offsetHeight * 0.55;       // px hasta el centro de masas
    g = 9800 / Math.max(length, 150);                     // 1 px ≈ 1 mm
    pivot = { x: f.left + card.offsetLeft + card.offsetWidth / 2, y: f.top };
  };

  const render = () => {
    const twist = Math.max(-10, Math.min(10, omega * 3));   // la tarjeta gira un poco sobre la cinta
    card.style.transform =
      `translateY(${y.toFixed(2)}px) rotate(${theta.toFixed(4)}rad) rotateY(${twist.toFixed(2)}deg)`;
  };

  const step = (now) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000 || 0, 1 / 30);
    last = now; t += dt;

    if (!dragging) {
      const breeze = Math.sin(t * 0.8) * 0.12 + Math.sin(t * 2.3 + 1) * 0.05;   // casi imperceptible
      const alpha = -g * Math.sin(theta - REST) - DAMPING * omega + breeze;
      omega += alpha * dt;
      theta += omega * dt;
      if (Math.abs(theta) > MAX) { theta = Math.sign(theta) * MAX; omega *= -0.4; }
    }
    // muelle vertical: la cinta estira y recoge
    vy += (-160 * y - 9 * vy) * dt;
    y = Math.max(-70, Math.min(40, y + vy * dt));

    render();
    requestAnimationFrame(step);
  };

  const start = () => {
    if (running || !visible) return;
    running = true; last = performance.now();
    requestAnimationFrame(step);
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start(); else running = false;
  }).observe(figure);

  // ángulo que tendría la tarjeta si apuntara al puntero desde el punto de giro
  const angleTo = (x, py) => -Math.atan2(x - pivot.x, Math.max(py - pivot.y, 1));

  card.addEventListener('pointerdown', (e) => {
    measure();
    card.setPointerCapture(e.pointerId);
    card.classList.add('is-dragging');
    figure.classList.add('was-touched');
    dragging = { offset: theta - angleTo(e.clientX, e.clientY), prev: theta, time: performance.now() };
    omega = 0;
  });

  card.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const next = Math.max(-MAX, Math.min(MAX, angleTo(e.clientX, e.clientY) + dragging.offset));
    const dt = Math.max((now - dragging.time) / 1000, 1 / 240);
    omega = omega * 0.5 + ((next - dragging.prev) / dt) * 0.5;   // velocidad suavizada para lanzarla
    theta = next;
    dragging.prev = next; dragging.time = now;
  });

  const release = () => {
    if (!dragging) return;
    dragging = null;
    card.classList.remove('is-dragging');
    omega = Math.max(-6, Math.min(6, omega));
  };
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);

  // rozarla con el cursor la empuja en la dirección del movimiento
  let lastX = null, lastT = 0;
  figure.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (!dragging && lastX !== null && e.pointerType === 'mouse') {
      const r = card.getBoundingClientRect();
      const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      if (inside) {
        const vx = (e.clientX - lastX) / Math.max(now - lastT, 8) * 1000;   // px/s
        omega -= vx * 0.0005;
        figure.classList.add('was-touched');
      }
    }
    lastX = e.clientX; lastT = now;
  });
  figure.addEventListener('pointerleave', () => { lastX = null; });

  // el scroll sacude la cinta: estirón vertical y algo de balanceo
  let lastScroll = scrollY;
  addEventListener('scroll', () => {
    const d = scrollY - lastScroll;
    lastScroll = scrollY;
    if (!visible) return;
    vy = Math.max(-250, Math.min(250, vy + d * 1.2));
    omega += Math.max(-0.5, Math.min(0.5, d * 0.004)) * (theta >= REST ? 1 : -1);
    measure();
  }, { passive: true });

  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();
  render();
  start();
})();
