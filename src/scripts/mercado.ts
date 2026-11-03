// El Mercado en el navegador: entrar con enlace mágico, el directorio, tu perfil y la ficha de cada persona.
// Todo el texto que viene de la base de datos se pinta con textContent: nunca como HTML.
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, PHOTO_BUCKET } from '../lib/supabase';
import { mercadoCopy, mercadoUrl, type MercadoCopy } from '../data/mercado';
import { mareas } from '../data/mareas';
import { editPhoto } from './mercado-photo';
import type { Locale } from '../data/pages';

type Person = {
  id: string; name: string; role?: string | null; company?: string | null; building?: string | null;
  photo?: string | null; mareas: string[]; self?: boolean;
  website?: string | null; linkedin?: string | null; x?: string | null; github?: string | null; email?: string | null;
};
type Directory = { admin: boolean; canSee: boolean; total: number; member: boolean; mareas: string[]; people: Person[]; hidden: string[][] };
type Ctx = { root: HTMLElement; lang: Locale; t: MercadoCopy; sb: SupabaseClient };

// ---------- utilidades ----------

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string> = {}, ...children: (Node | string | null | false | undefined)[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k === 'class' ? (el.className = v) : el.setAttribute(k, v);
  for (const c of children) if (c) el.append(c);
  return el;
}

const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;

function show(root: HTMLElement, state: string) {
  root.querySelectorAll<HTMLElement>('[data-state]').forEach((el) => { el.hidden = el.dataset.state !== state; });
}

const mareaTitle = (lang: Locale, n: string) => mareas.find((m) => m.number === n)?.title[lang];
// Un enlace válido: https, con dominio (algo.algo). Si no, null: nunca rompe la página.
function parseLink(u?: string | null) {
  if (!u) return null;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname) ? url : null;
  } catch { return null; }
}
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

async function signedPhotos(sb: SupabaseClient, paths: string[]) {
  const map = new Map<string, string>();
  if (!paths.length) return map;
  const { data } = await sb.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
  data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  return map;
}

function photoBox(name: string, url?: string) {
  return h('span', { class: 'm-photo' }, url
    ? h('img', { src: url, alt: '', width: '480', height: '600', loading: 'lazy', decoding: 'async' })
    : h('span', { class: 'm-initials', 'aria-hidden': 'true' }, initials(name)));
}

async function session(sb: SupabaseClient) {
  const { data } = await sb.auth.getSession();
  return data.session;
}

// ---------- entrar y directorio ----------

async function indexView({ root, lang, t, sb }: Ctx) {
  // El enlace mágico vuelve con el token (o con un error) en el hash.
  const hash = new URLSearchParams(location.hash.slice(1));
  const linkError = hash.get('error_code') || hash.get('error');
  const token = hash.get('invitacion');
  const s = await session(sb);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);

  if (!s) {
    // Botón de la invitación: se canjea aquí, con un POST, y lleva dentro sin pasar por el correo.
    if (token) {
      const { data } = await sb.functions.invoke('mercado-invite', { body: { t: token } });
      if (data?.url) { location.replace(data.url); return; }
      return loginView({ root, lang, t, sb }, true, data?.email ?? '');
    }
    return loginView({ root, lang, t, sb }, !!linkError);
  }

  const [{ data, error }, own] = await Promise.all([
    sb.rpc('mercado_directory'),
    sb.from('mercado_profiles').select('visible').maybeSingle(),
  ]);
  if (error || !data) return loginView({ root, lang, t, sb }, false);
  const dir = data as Directory;
  show(root, 'dir');

  $(root, '[data-lead]').textContent = dir.admin ? t.adminLead : t.dirLead;
  $(root, '[data-signout]').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });

  const notice = $(root, '[data-notice]');
  notice.replaceChildren();
  notice.hidden = dir.member || dir.admin;
  if (!notice.hidden) notice.append(h('p', {}, t.notMember));

  // Sin perfil visible no se ve a nadie: solo cuántos hay y el camino para rellenarlo.
  const gate = $(root, '[data-gate]');
  gate.hidden = dir.canSee || !dir.member;
  $(root, '[data-browse]').hidden = !dir.canSee;
  if (!dir.canSee) {
    $(gate, '[data-gate-lead]').textContent = own.data && !own.data.visible ? t.gateHidden : t.gateLead(dir.total);
    return;
  }

  const exportBtn = $(root, '[data-export]');
  exportBtn.hidden = !dir.admin;
  if (dir.admin) exportBtn.addEventListener('click', () => exportCsv(sb));

  const photos = await signedPhotos(sb, dir.people.map((p) => p.photo).filter(Boolean) as string[]);
  const filters = $(root, '[data-filters]');
  const grid = $(root, '[data-grid]');
  const count = $(root, '[data-count]');

  // Filtro: null = todas, EVERY = quien estuvo en todas mis mareas, o el número de una marea.
  const EVERY = '*';
  const matches = (mareas: string[], filter: string | null) =>
    !filter || (filter === EVERY ? dir.mareas.every((n) => mareas.includes(n)) : mareas.includes(filter));
  const render = (marea: string | null) => {
    const people = dir.people.filter((p) => matches(p.mareas, marea));
    const hidden = dir.hidden.filter((m) => matches(m, marea));
    count.textContent = t.count(people.length, hidden.length);
    grid.replaceChildren(
      ...people.map((p) => h('li', {}, h('a', { class: 'm-card', href: `${mercadoUrl(lang, 'persona')}?id=${encodeURIComponent(p.id)}` },
        photoBox(p.name, p.photo ? photos.get(p.photo) : undefined),
        h('span', { class: 'm-card-body' },
          p.self && h('span', { class: 'm-self' }, t.you),
          h('b', { class: 'm-name' }, p.name),
          (p.role || p.company) && h('span', { class: 'm-role' }, [p.role, p.company].filter(Boolean).join(' · ')),
          p.building && h('span', { class: 'm-building' }, p.building),
          h('span', { class: 'm-mareas' }, p.mareas.map((n) => `Marea ${n}`).join(' · ')),
        ),
      ))),
      ...hidden.map((m) => h('li', {}, h('div', { class: 'm-card m-card--hidden' },
        h('span', { class: 'm-photo' }, h('span', { class: 'm-initials', 'aria-hidden': 'true' }, '?')),
        h('span', { class: 'm-card-body' },
          h('b', { class: 'm-name' }, t.hidden),
          h('span', { class: 'm-role' }, t.hiddenLine),
          h('span', { class: 'm-mareas' }, m.map((n) => `Marea ${n}`).join(' · ')),
        ),
      ))),
    );
    $(root, '[data-empty]').hidden = people.length + hidden.length > 0;
    filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.marea || null) === marea)));
  };

  const filterButton = (marea: string | null) => {
    const label = marea === EVERY ? (dir.admin ? t.everyAdmin : t.every) : marea ? `Marea ${marea}` : t.all;
    const title = marea && marea !== EVERY ? mareaTitle(lang, marea) ?? label : label;
    const b = h('button', { type: 'button', class: 'm-filter', 'data-marea': marea ?? '', title }, label);
    b.addEventListener('click', () => render(marea));
    return b;
  };
  filters.replaceChildren(...(dir.mareas.length > 1 ? [filterButton(null), filterButton(EVERY), ...dir.mareas.map(filterButton)] : []));
  filters.hidden = dir.mareas.length < 2;
  render(null);
}

function loginView({ root, lang, t, sb }: Ctx, expired: boolean, invited = '') {
  show(root, 'login');
  const form = $<HTMLFormElement>(root, '[data-login]');
  const status = $(root, '[data-status]');
  const button = $<HTMLButtonElement>(form, 'button');
  status.textContent = expired ? t.expired : '';
  // Si la invitación ya no vale, el correo sale ya escrito.
  form.querySelector<HTMLInputElement>('input[name="email"]')!.value = invited;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = String(new FormData(form).get('email') ?? '').trim().toLowerCase();
    if (!email) return;
    button.disabled = true; button.textContent = t.sending;
    const { error } = await sb.auth.signInWithOtp({
      email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + mercadoUrl(lang) },
    });
    button.disabled = false; button.textContent = t.send;
    status.textContent = error ? t.sendError : t.sent(email);
    if (!error) form.reset();
  });
}

async function exportCsv(sb: SupabaseClient) {
  const { data } = await sb.rpc('mercado_admin_export');
  const rows = (data ?? []) as Record<string, unknown>[];
  const cols = ['email', 'name', 'role', 'company', 'building', 'website', 'linkedin', 'x', 'github', 'visible', 'mareas'];
  // Todo como texto: entre comillas y con ' delante de lo que una hoja de cálculo tomaría por fórmula.
  const cell = (v: unknown) => {
    let s = Array.isArray(v) ? v.join(' ') : v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
  const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: 'mercado.csv' });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- tu perfil ----------

// Acepta "linkedin.com/in/tu", "@tu" o "tu" y lo deja como https://…
function normaliseLink(field: string, raw: string) {
  const v = raw.trim();
  if (!v) return null;
  const handle = v.replace(/^@/, '');
  if (field === 'x' && /^[A-Za-z0-9_]{1,15}$/.test(handle)) return `https://x.com/${handle}`;
  if (field === 'github' && /^[A-Za-z0-9-]{1,39}$/.test(handle)) return `https://github.com/${handle}`;
  const url = parseLink(/^https?:\/\//i.test(v) ? v.replace(/^http:/i, 'https:') : `https://${v}`);
  return url ? url.href : undefined; // undefined = escrito pero no válido
}

async function profileView({ root, lang, t, sb }: Ctx) {
  const s = await session(sb);
  if (!s) return location.assign(mercadoUrl(lang));
  show(root, 'edit');

  const form = $<HTMLFormElement>(root, '[data-profile]');
  const status = $(root, '[data-status]');
  const save = $<HTMLButtonElement>(form, '[data-save]');
  const preview = $(root, '[data-photo-preview]');
  const photoInput = $<HTMLInputElement>(form, '[data-photo-input]');
  const photoLabel = $(form, '[data-photo-label]');
  const photoRemove = $<HTMLButtonElement>(form, '[data-photo-remove]');
  const photoEditor = $(form, '[data-photo-editor]');
  const photoStatus = $(form, '[data-photo-status]');
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

  const { data: profile } = await sb.from('mercado_profiles').select('*').maybeSingle();
  let savedPhoto: string | null = profile?.photo ?? null;
  let photo: string | null = savedPhoto;

  field('name').value = profile?.name ?? s.user.user_metadata?.name ?? '';
  for (const k of ['role', 'company', 'building', 'website', 'linkedin', 'x', 'github']) field(k).value = profile?.[k] ?? '';
  $(root, '[data-remove]').hidden = !profile;

  // Modo incógnito: un botón que se guarda al momento si ya hay perfil.
  let saved = !!profile;
  let incognito = profile ? !profile.visible : false;
  const toggle = $<HTMLButtonElement>(root, '[data-incognito]');
  const paintIncognito = () => {
    toggle.setAttribute('aria-pressed', String(incognito));
    $(root, '[data-incognito-state]').textContent = incognito ? t.incognitoOn : t.incognitoOff;
    $(root, '[data-incognito-hint]').textContent = incognito ? t.incognitoOnHint : t.incognitoOffHint;
  };
  paintIncognito();
  toggle.addEventListener('click', async () => {
    incognito = !incognito;
    paintIncognito();
    if (!saved) return;
    status.textContent = t.saving;
    const { error } = await sb.from('mercado_profiles').update({ visible: !incognito, updated_at: new Date().toISOString() }).eq('id', s.user.id);
    if (error) { incognito = !incognito; paintIncognito(); }
    status.textContent = error ? t.saveError : t.saved;
  });

  const paintPhoto = async () => {
    const url = photo ? (await signedPhotos(sb, [photo])).get(photo) : undefined;
    preview.replaceChildren(photoBox(field('name').value || '?', url));
    photoLabel.textContent = photo ? t.photoChange : t.photoAdd;
    photoRemove.hidden = !photo;
  };
  await paintPhoto();

  // Guardar el perfil y cambiar la foto se excluyen: el perfil tiene que guardar la foto que se ve.
  // «Guardar» no se desactiva mientras se encuadra o se sube la foto: espera a que acabe.
  let photoTask: Promise<boolean> | null = null, saving = false;
  const syncControls = () => {
    save.disabled = saving;
    photoInput.disabled = saving || !!photoTask;
    photoRemove.disabled = saving;
    photoLabel.closest('label')!.hidden = !!photoTask;
    photoRemove.hidden = !!photoTask || !photo;
  };

  // Devuelve false si la foto elegida no se ha podido subir.
  const changePhoto = async (file: File) => {
    photoStatus.textContent = '';
    photoEditor.hidden = false;
    preview.hidden = true;
    let blob: Blob | null = null, unreadable = false;
    try { blob = await editPhoto(photoEditor, file); } catch { unreadable = true; }
    photoEditor.hidden = true;
    preview.hidden = false;
    if (unreadable) photoStatus.textContent = t.photoBad;
    if (!blob) return true;
    photoStatus.textContent = t.saving;
    try {
      const path = `${s.user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      if (photo && photo !== savedPhoto) await sb.storage.from(PHOTO_BUCKET).remove([photo]);
      photo = path;
      await paintPhoto();
      photoStatus.textContent = '';
      return true;
    } catch {
      photoStatus.textContent = t.saveError;
      return false;
    }
  };

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    photoInput.value = '';
    if (!file) return;
    photoTask = changePhoto(file);
    syncControls();
    await photoTask;
    photoTask = null;
    syncControls();
  });
  photoRemove.addEventListener('click', async () => {
    if (photo && photo !== savedPhoto) await sb.storage.from(PHOTO_BUCKET).remove([photo]);
    photo = null;
    await paintPhoto();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (k: string) => field(k).value.trim() || null;
    const row = {
      id: s.user.id, name: field('name').value.trim(), role: text('role'), company: text('company'), building: text('building'),
      website: normaliseLink('website', field('website').value), linkedin: normaliseLink('linkedin', field('linkedin').value),
      x: normaliseLink('x', field('x').value), github: normaliseLink('github', field('github').value),
      photo, visible: !incognito, updated_at: new Date().toISOString(),
    };
    if (!row.name) { status.textContent = t.needName; return field('name').focus(); }
    const bad = (['website', 'linkedin', 'x', 'github'] as const).find((k) => row[k] === undefined);
    if (bad) { status.textContent = t.badLink; return field(bad).focus(); }
    if (!row.website && !row.linkedin && !row.x && !row.github) { status.textContent = t.needLink; return field('website').focus(); }
    saving = true; syncControls(); status.textContent = t.saving;
    // Con el editor abierto, «Guardar» usa la foto tal como está encuadrada.
    if (photoTask) {
      if (!photoEditor.hidden) $<HTMLButtonElement>(photoEditor, '[data-photo-use]').click();
      if (!(await photoTask)) { saving = false; syncControls(); status.textContent = t.saveError; return; }
      row.photo = photo;
    }
    const { error } = await sb.from('mercado_profiles').upsert(row);
    saving = false; syncControls();
    if (error) { status.textContent = t.saveError; return; }
    if (savedPhoto && savedPhoto !== photo) await sb.storage.from(PHOTO_BUCKET).remove([savedPhoto]);
    savedPhoto = photo;
    saved = true;
    for (const k of ['website', 'linkedin', 'x', 'github'] as const) field(k).value = row[k] ?? '';
    $(root, '[data-remove]').hidden = false;
    status.textContent = t.saved;
  });

  $(root, '[data-remove]').addEventListener('click', async () => {
    if (!confirm(t.removeConfirm)) return;
    await sb.from('mercado_profiles').delete().eq('id', s.user.id);
    const { data: files } = await sb.storage.from(PHOTO_BUCKET).list(s.user.id);
    if (files?.length) await sb.storage.from(PHOTO_BUCKET).remove(files.map((f) => `${s.user.id}/${f.name}`));
    location.assign(mercadoUrl(lang));
  });
}

// ---------- ficha de otra persona ----------

async function personView({ root, lang, t, sb }: Ctx) {
  const s = await session(sb);
  if (!s) return location.assign(mercadoUrl(lang));
  const id = new URLSearchParams(location.search).get('id') ?? '';
  const { data } = /^[0-9a-f-]{36}$/.test(id) ? await sb.rpc('mercado_person', { target: id }) : { data: null };
  const admin = (await sb.rpc('mercado_is_admin')).data === true;
  if (!data) { show(root, 'missing'); return; }
  const p = data as Person;
  show(root, 'person');
  const url = p.photo ? (await signedPhotos(sb, [p.photo])).get(p.photo) : undefined;
  $(root, '[data-photo]').replaceChildren(photoBox(p.name, url));
  $(root, '[data-name]').textContent = p.name;
  $(root, '[data-role]').textContent = [p.role, p.company].filter(Boolean).join(' · ');
  $(root, '[data-building]').textContent = p.building ?? '';
  $(root, '[data-shared-label]').textContent = admin ? t.sharedAdmin : t.shared;
  $(root, '[data-shared]').replaceChildren(...p.mareas.map((n) => h('li', {},
    h('a', { href: `${lang === 'en' ? '/en' : ''}/mareas/${n}` }, `Marea ${n}`), mareaTitle(lang, n) ? ` · ${mareaTitle(lang, n)}` : '')));
  const links: [string, string | null | undefined][] = [['Web', p.website], ['LinkedIn', p.linkedin], ['X', p.x], ['GitHub', p.github]];
  const list = $(root, '[data-links]');
  list.replaceChildren(...links.map(([label, u]) => [label, parseLink(u)] as const).filter(([, url]) => url).map(([label, url]) => h('li', {},
    h('a', { href: url!.href, target: '_blank', rel: 'noopener nofollow ugc' }, h('span', {}, label), url!.host + url!.pathname.replace(/\/$/, '')))));
  if (p.email) list.append(h('li', {}, h('a', { href: `mailto:${p.email}` }, h('span', {}, 'Email'), p.email)));
  list.hidden = !list.childElementCount;

  // Admin: borrar el perfil (fotos incluidas). La cuenta sigue: puede volver y rellenarlo otra vez.
  $(root, '[data-admin]').hidden = !admin;
  if (admin) $(root, '[data-admin-delete]').addEventListener('click', async () => {
    if (!confirm(t.adminDeleteConfirm(p.name))) return;
    const { data: files } = await sb.storage.from(PHOTO_BUCKET).list(p.id);
    if (files?.length) await sb.storage.from(PHOTO_BUCKET).remove(files.map((f) => `${p.id}/${f.name}`));
    const { error } = await sb.rpc('mercado_admin_delete_profile', { target: p.id });
    if (error) return alert(t.saveError);
    location.assign(mercadoUrl(lang));
  });
}

// ---------- arranque ----------

document.addEventListener('astro:page-load', () => {
  const root = document.querySelector<HTMLElement>('[data-mercado]');
  if (!root) return;
  const lang = (root.dataset.lang as Locale) ?? 'es';
  const t = mercadoCopy[lang];
  const sb = supabase();
  if (!sb) return show(root, 'off');
  const ctx = { root, lang, t, sb };
  ({ index: indexView, perfil: profileView, persona: personView } as const)[root.dataset.mercado as 'index']?.(ctx);
});
