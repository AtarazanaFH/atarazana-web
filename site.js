/* Atarazana Founder House · interacciones pequeñas y mecánicas */

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

  // con música, cada golpe de bombo la estira hacia abajo y la empuja a un lado y a otro
  let side = 1;
  addEventListener('music:beat', (e) => {
    if (!visible || dragging) return;
    side = -side;
    vy += 70 * e.detail;
    omega += side * 0.35 * e.detail;
  });

  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();
  render();
  start();
})();

/* Música de fondo: audio/fondo.mp3 en bucle. Empieza apagada; se enciende con el botón de abajo a la izquierda.
   Al pasar de una página a otra de la web sigue sonando por donde iba. Al recargar, o al salir y volver
   a entrar desde fuera, empieza de cero y apagada. */
(() => {
  const src = new URL('audio/fondo.mp3', document.currentScript.src).href;
  const store = (fn) => { try { return fn(); } catch { return null; } };

  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0.35;
  audio.preload = 'auto';
  // ¿venimos de otra página de la web? Recargar o llegar desde fuera cuenta como entrar de nuevo
  const nav = performance.getEntriesByType?.('navigation')[0];
  const fromInside = nav?.type !== 'reload'
    && store(() => new URL(document.referrer).origin === location.origin);
  if (!fromInside) store(() => { sessionStorage.removeItem('bg-time'); sessionStorage.removeItem('bg-on'); });

  const saved = parseFloat(store(() => sessionStorage.getItem('bg-time')));
  if (saved > 0) audio.addEventListener('loadedmetadata', () => { audio.currentTime = saved % audio.duration; }, { once: true });

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-toggle';
  document.body.appendChild(btn);

  const en = document.documentElement.lang === 'en';
  const label = en ? { on: 'Music on', off: 'Play music', mute: 'Mute music' }
                   : { on: 'Música on', off: 'Pon la música', mute: 'Silenciar música' };
  let wanted = store(() => sessionStorage.getItem('bg-on')) === '1';   // la persona la encendió en esta visita
  let muted = !wanted;
  const render = () => {
    const on = !muted && !audio.paused;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? label.mute : label.off);
    btn.innerHTML = `<span class="sound-bars" aria-hidden="true"><i></i><i></i><i></i></span>${on ? label.on : label.off}`;
  };

  /* Analizador: lee graves, medios y la forma de onda para que la web se mueva con la música.
     Se crea en un gesto, porque un AudioContext creado sin él nace suspendido y deja el audio mudo. */
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let analyser = null;
  const connect = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (still || !Ctx) return;
    if (!analyser) {
      const ctx = new Ctx();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.55;
      analyser.maxDecibels = -10;   // con el valor por defecto (-30) los graves del tema saturan y no se distinguen golpes
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);
    }
    analyser.context.resume();
  };

  const play = () => { if (!muted) audio.play().then(render, render); };
  // Varios tipos de gesto porque cada navegador acepta unos distintos para desbloquear el audio.
  const gestures = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'];
  const unlock = (e) => {
    if (e.target.closest?.('.sound-toggle')) return;
    connect();
    startVisuals();
    if (muted) return;
    audio.play().then(() => {
      gestures.forEach((t) => window.removeEventListener(t, unlock, true));
      render();
    }, render);
  };
  gestures.forEach((t) => window.addEventListener(t, unlock, true));

  btn.addEventListener('click', () => {
    muted = !audio.paused;
    store(() => sessionStorage.setItem('bg-on', muted ? '0' : '1'));
    if (!muted) connect();
    muted ? audio.pause() : audio.play().then(render, render);
    render();
  });

  /* Lo que se mueve con la música:
     - una onda (osciloscopio) fija en el borde inferior de la pantalla,
     - las flechas del bloque rojo laten con los graves,
     - cada golpe de bombo lanza un anillo cuadrado detrás del pase y le da un empujón,
     - las barras del botón muestran graves, medios y agudos de verdad. */
  const wave = document.createElement('canvas');
  wave.className = 'beat-wave';
  wave.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wave);
  const pen = wave.getContext('2d');
  const pulsing = document.querySelectorAll('.field, .hero-pass');
  const passFrame = document.querySelector('.hero-pass');

  let running = false, avgBass = 0, lastBeat = 0, bassSmooth = 0;
  const band = (data, from, to) => {
    let sum = 0;
    for (let i = from; i < to; i++) sum += data[i];
    return sum / (to - from) / 255;
  };

  const ring = (strength) => {
    if (!passFrame || passFrame.getBoundingClientRect().bottom < 0) return;
    const el = document.createElement('span');
    el.className = 'beat-ring';
    el.style.setProperty('--k', strength.toFixed(2));
    passFrame.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  };

  const frame = (now) => {
    if (!running) return;
    const freq = new Uint8Array(analyser.frequencyBinCount);
    const time = new Uint8Array(analyser.fftSize);
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(time);

    // con fftSize 1024 cada franja mide ~43 Hz: 1–4 es el bombo, 8–60 voces y bajo, 60–200 platos
    const bass = band(freq, 1, 5), mid = band(freq, 8, 60), high = band(freq, 60, 200);
    bassSmooth += (bass - bassSmooth) * 0.35;
    avgBass += (bass - avgBass) * 0.04;
    // el pulso se mide contra la media reciente, así late igual en las partes flojas y en las fuertes
    const pulse = Math.max(0, Math.min(1, (bassSmooth - avgBass * 0.95) / 0.15));
    pulsing.forEach((el) => el.style.setProperty('--bass', pulse.toFixed(3)));

    // golpe: los graves saltan por encima de su media reciente (ajustado con el tema: ~2 por segundo)
    if (bass > avgBass * 1.05 && bass > 0.5 && now - lastBeat > 280) {
      lastBeat = now;
      const k = Math.max(0.4, Math.min(1, (bass - avgBass) / 0.15));
      ring(k);
      window.dispatchEvent(new CustomEvent('music:beat', { detail: k }));
    }

    btn.querySelectorAll('.sound-bars i').forEach((bar, i) => {
      bar.style.height = `${3 + [bass, mid, high][i] * 9}px`;
    });

    // osciloscopio
    const dpr = window.devicePixelRatio || 1;
    const w = wave.clientWidth, h = wave.clientHeight;
    if (wave.width !== w * dpr) { wave.width = w * dpr; wave.height = h * dpr; }
    pen.setTransform(dpr, 0, 0, dpr, 0, 0);
    pen.clearRect(0, 0, w, h);
    pen.beginPath();
    const step = 4, n = time.length;
    for (let i = 0; i < n; i += step) {
      const x = (i / (n - step)) * w;
      const y = h / 2 + ((time[i] - 128) / 128) * (h / 2) * 0.9;
      i ? pen.lineTo(x, y) : pen.moveTo(x, y);
    }
    pen.strokeStyle = `rgba(255, 45, 45, ${0.35 + pulse * 0.6})`;
    pen.lineWidth = 1.5;
    pen.stroke();

    requestAnimationFrame(frame);
  };

  const startVisuals = () => {
    if (running || !analyser || audio.paused) return;
    running = true;
    btn.classList.add('is-live');
    wave.classList.add('is-on');
    requestAnimationFrame(frame);
  };
  const stopVisuals = () => {
    running = false;
    btn.classList.remove('is-live');
    wave.classList.remove('is-on');
    pulsing.forEach((el) => el.style.setProperty('--bass', '0'));
  };

  audio.addEventListener('error', () => btn.remove());
  audio.addEventListener('play', render);
  audio.addEventListener('pause', () => { render(); stopVisuals(); });
  // si sonó por autoplay sin gesto, el analizador espera al primer gesto para no dejar el audio mudo
  audio.addEventListener('playing', () => {
    if (analyser || navigator.userActivation?.hasBeenActive) connect();
    startVisuals();
  });
  window.addEventListener('pagehide', () => store(() => sessionStorage.setItem('bg-time', String(audio.currentTime))));

  render();
  play();
})();
