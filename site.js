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
