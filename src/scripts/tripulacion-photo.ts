// Editor de la foto de perfil: encuadrar, hacer zoom y girar. El mismo lienzo sirve para ver y para exportar.
// Todas las fotos salen a 480×600 en JPEG y, como mucho, con MAX_BYTES.
const W = 480, H = 600, MAX_ZOOM = 4, MAX_BYTES = 200 * 1024;
const QUALITIES = [0.85, 0.75, 0.65, 0.55];

const toJpeg = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) =>
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo exportar'))), 'image/jpeg', quality));

// La calidad más alta que cabe en el tope.
async function encode(canvas: HTMLCanvasElement) {
  let blob!: Blob;
  for (const quality of QUALITIES) {
    blob = await toJpeg(canvas, quality);
    if (blob.size <= MAX_BYTES) break;
  }
  return blob;
}

// Devuelve la foto editada, o null si se cancela. Falla si el navegador no puede abrir el archivo.
export async function editPhoto(editor: HTMLElement, file: File) {
  const img = await createImageBitmap(file);
  const canvas = editor.querySelector<HTMLCanvasElement>('canvas')!;
  const slider = editor.querySelector<HTMLInputElement>('[data-photo-zoom]')!;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingQuality = 'high';
  const background = getComputedStyle(canvas).getPropertyValue('--black');

  // Giros de 90° en sentido horario. cx y cy son el centro del encuadre, en píxeles de la imagen ya girada.
  let turns = 0, zoom = 1, cx = img.width / 2, cy = img.height / 2;
  const size = () => (turns % 2 ? [img.height, img.width] : [img.width, img.height]) as [number, number];
  const scale = () => { const [w, h] = size(); return Math.max(W / w, H / h) * zoom; };

  const paint = () => {
    const [w, h] = size(), s = scale();
    // El encuadre nunca se sale de la imagen.
    const halfW = W / s / 2, halfH = H / s / 2;
    cx = Math.min(Math.max(cx, halfW), w - halfW);
    cy = Math.min(Math.max(cy, halfH), h - halfH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2);
    ctx.scale(s, s);
    ctx.translate(w / 2 - cx, h / 2 - cy);
    ctx.rotate(turns * Math.PI / 2);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
  };
  const setZoom = (value: number) => {
    zoom = Math.min(Math.max(value, 1), MAX_ZOOM);
    slider.value = String(zoom);
    paint();
  };

  const listeners = new AbortController();
  const { signal } = listeners;
  const pointers = new Map<number, { x: number; y: number }>();
  const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a!.x - b!.x, a!.y - b!.y); };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }, { signal });
  canvas.addEventListener('pointermove', (e) => {
    const last = pointers.get(e.pointerId);
    if (!last) return;
    const before = pointers.size === 2 ? spread() : 0;
    const now = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, now);
    if (before) return setZoom(zoom * spread() / before); // dos dedos: zoom
    const toImage = W / canvas.getBoundingClientRect().width / scale();
    cx -= (now.x - last.x) * toImage;
    cy -= (now.y - last.y) * toImage;
    paint();
  }, { signal });
  for (const end of ['pointerup', 'pointercancel'] as const) {
    canvas.addEventListener(end, (e) => { pointers.delete(e.pointerId); }, { signal });
  }
  canvas.addEventListener('keydown', (e) => {
    const step = 16 / scale();
    const move: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const delta = move[e.key];
    if (!delta) return;
    e.preventDefault();
    cx += delta[0]; cy += delta[1];
    paint();
  }, { signal });
  slider.addEventListener('input', () => setZoom(Number(slider.value)), { signal });
  editor.querySelector('[data-photo-rotate]')!.addEventListener('click', () => {
    const [, h] = size();
    [cx, cy] = [h - cy, cx];
    turns = (turns + 1) % 4;
    paint();
  }, { signal });

  setZoom(1);
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      editor.querySelector('[data-photo-use]')!.addEventListener('click', () => { encode(canvas).then(resolve, reject); }, { signal });
      editor.querySelector('[data-photo-cancel]')!.addEventListener('click', () => resolve(null), { signal });
    });
  } finally {
    listeners.abort();
    img.close();
  }
}
