import type { Locale } from './pages';
import type { PartnerId } from './partners';

// Cada encuentro es una marea. Para crear una nueva, añade una entrada al principio
// de `mareas`: la portada, el catálogo (/mareas) y su página (/mareas/NNN) salen de aquí.
//
// `draft: true` → la marea solo se ve con `npm run dev`. Ni su tarjeta ni su página
// se publican hasta quitarlo. Mientras no haya ninguna marea publicada, tampoco se
// publica el catálogo ni aparece en el menú.

type Text = Record<Locale, string>;

export interface Talk {
  speaker: string;
  poster?: string;          // slug del cartel en public/assets/speakers/ (y su retrato en speakers/thumbs/)
  title: Text;
  line: Text;               // una línea sobre quien habla
}

export interface Marea {
  number: string;           // "001"
  date: string;             // AAAA-MM-DD
  doors?: string;           // "19:00"
  venue?: string;           // se publica cuando la marea ha pasado
  capacity: number;
  format: Text;             // "Charlas", "Demos"…
  title: Text;              // nombre de la noche
  summary: Text;            // una frase para la tarjeta
  body?: Record<Locale, string[]>; // crónica, después del encuentro
  talks: Talk[];
  partners: PartnerId[];
  luma?: string;
  draft?: boolean;
}

export const mareas: Marea[] = [
  {
    number: '002',
    date: '2026-12-03',
    capacity: 45,
    format: { es: 'Charlas', en: 'Talks' },
    title: { es: 'Segunda marea', en: 'Second Marea' },
    summary: {
      es: 'Charlas y tiempo para hablar en Málaga. Ponentes por anunciar.',
      en: 'Talks and time to chat in Málaga. Speakers to be announced.',
    },
    talks: [
      { speaker: '', title: { es: 'Charla', en: 'Talk' }, line: { es: '', en: '' } },
      { speaker: '', title: { es: 'Charla', en: 'Talk' }, line: { es: '', en: '' } },
      { speaker: '', title: { es: 'Charla técnica', en: 'Technical talk' }, line: { es: '', en: '' } },
    ],
    partners: [],
    luma: 'https://luma.com/dox9nwj4',
  },
  {
    number: '001',
    date: '2026-10-29',
    capacity: 30,
    format: { es: 'Charlas', en: 'Talks' },
    title: { es: 'Primera marea', en: 'First Marea' },
    summary: {
      es: 'Tres charlas de gente que está construyendo en Málaga y, después, tiempo para hablar.',
      en: 'Three talks from people building in Málaga, then time to talk.',
    },
    talks: [
      {
        speaker: 'Carlos Galán', poster: 'carlos-galan',
        title: { es: 'De Shanghái a Tahona', en: 'From Shanghai to Tahona' },
        line: { es: 'Su paso por Xiji Incubator, en Shanghái, y cómo montó Tahona', en: 'Time at Xiji Incubator in Shanghai, and building Tahona from an idea' },
      },
      {
        speaker: 'Victor González', poster: 'victor-gonzalez',
        title: { es: 'Vivir de tus propias apps', en: 'Making a living from your own apps' },
        line: { es: 'De desarrollador en Qamarero a indie hacker a tiempo completo', en: 'From developer at Qamarero to full-time indie hacker' },
      },
      {
        speaker: 'Ernesto Romance', poster: 'ernesto-romance',
        title: { es: 'Centros de datos en órbita', en: 'Data centres in orbit' },
        line: { es: 'Ingeniero aeroespacial, monta una empresa de satélites con GPUs para IA', en: 'Aerospace engineer building satellites with GPUs for AI' },
      },
    ],
    partners: ['segurosia'],
    luma: 'https://luma.com/rjl7pq7g',
  },
];

const today = new Date().toISOString().slice(0, 10);

export const isPast = (m: Marea) => m.date < today;
export const isVisible = (m: Marea) => !m.draft || import.meta.env.DEV;

// Mareas que se pueden enseñar en el catálogo, de la más reciente a la más antigua.
export const visibleMareas = mareas.filter(isVisible);
export const archiveLive = visibleMareas.length > 0;

// La próxima marea que anuncia la portada (borradores incluidos: el borrador es la tarjeta del archivo, no el anuncio).
export const nextMarea = [...mareas].reverse().find((m) => !isPast(m)) ?? mareas[0];

// Vecinas en el tiempo, para navegar entre mareas desde su página.
export function neighbours(m: Marea) {
  const i = visibleMareas.findIndex((x) => x.number === m.number);
  return { newer: visibleMareas[i - 1], older: visibleMareas[i + 1] };
}

export function mareaUrl(lang: Locale, m?: Marea) {
  const base = lang === 'en' ? '/en/mareas' : '/mareas';
  return m ? `${base}/${m.number}` : base;
}

export function formatDate(lang: Locale, iso: string, style: 'short' | 'long' | 'full' = 'long') {
  const date = new Date(`${iso}T12:00:00Z`);
  if (style === 'short') {
    const [y, mo, d] = iso.split('-');
    return `${d}·${mo}·${y.slice(2)}`;
  }
  const locale = lang === 'es' ? 'es-ES' : 'en-GB';
  const options: Intl.DateTimeFormatOptions = style === 'full'
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { day: 'numeric', month: 'long', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(locale, options).format(date);
}
