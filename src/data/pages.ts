export const pages = {
  "es": {
    "index": {
      "title": "Atarazana Founder House · Comunidad de builders en Málaga",
      "description": "Encuentros pequeños y frecuentes para la gente que construye tecnología en Málaga: founders, ingenieros, producto, diseño e IA. Charlas y tiempo para conocernos. Gratis y con invitación.",
      "socialDescription": "Conoce a quienes construyen tecnología en Málaga. Charlas, proyectos y tiempo para hablar. Gratis, con invitación.",
      "type": "website"
    },
    "partners": {
      "title": "Partners · Atarazana Founder House",
      "description": "Cómo funciona ser partner de Atarazana Founder House: qué pagas, qué recibes y qué no se puede comprar. La entrada es gratis para todos.",
      "socialDescription": "Cómo funciona ser partner de Atarazana Founder House: qué pagas, qué recibes y qué no se puede comprar. La entrada es gratis para todos.",
      "type": "website"
    },
    "manifesto": {
      "title": "Manifiesto · Atarazana Founder House",
      "description": "Por qué existe Atarazana Founder House, para quién es y cómo queremos que funcione: encuentros pequeños y frecuentes para la gente que construye tecnología en Málaga.",
      "socialDescription": "Por qué existe Atarazana Founder House, para quién es y cómo queremos que funcione: encuentros pequeños y frecuentes para la gente que construye tecnología en Málaga.",
      "type": "article"
    },
    "faq": {
      "title": "Preguntas frecuentes · Atarazana Founder House",
      "description": "Dónde es, cuánto cuesta, por qué hay invitación, si puedes llevar a alguien y en qué idioma se habla en Atarazana Founder House.",
      "socialDescription": "Dónde es, cuánto cuesta, por qué hay invitación y en qué idioma se habla en Atarazana Founder House.",
      "type": "website"
    }
  },
  "en": {
    "index": {
      "title": "Atarazana Founder House · Builder community in Málaga",
      "description": "Small, regular meetups for the people building technology in Málaga: founders, engineers, product, design and AI. Talks and time to get to know each other. Free and invite-only.",
      "socialDescription": "Meet people building technology in Málaga. Talks, projects and time to chat. Free, by invitation.",
      "type": "website"
    },
    "partners": {
      "title": "Partners · Atarazana Founder House",
      "description": "How being an Atarazana Founder House partner works: what you pay for, what you get and what cannot be bought. Entry is free for everyone.",
      "socialDescription": "How being an Atarazana Founder House partner works: what you pay for, what you get and what cannot be bought. Entry is free for everyone.",
      "type": "website"
    },
    "manifesto": {
      "title": "Manifesto · Atarazana Founder House",
      "description": "Why Atarazana Founder House exists, who it is for and how we want it to work: small, regular meetups for the people building technology in Málaga.",
      "socialDescription": "Why Atarazana Founder House exists, who it is for and how we want it to work: small, regular meetups for the people building technology in Málaga.",
      "type": "article"
    },
    "faq": {
      "title": "FAQ · Atarazana Founder House",
      "description": "Where it is, what it costs, why there are invites, whether you can bring someone and what language is spoken at Atarazana Founder House.",
      "socialDescription": "Where it is, what it costs, why there are invites and what language is spoken at Atarazana Founder House.",
      "type": "website"
    }
  }
} as const;
export type Locale = keyof typeof pages;
export type Page = keyof typeof pages.es;

// Rutas que cambian de nombre según el idioma; el resto usa la clave de la página.
const slugs: Record<Locale, Partial<Record<Page, string>>> = {
  es: { faq: 'preguntas' },
  en: {},
};

export function pageUrl(lang: Locale, page: Page) {
  const prefix = lang === 'en' ? '/en' : '';
  return page === 'index' ? prefix || '/' : `${prefix}/${slugs[lang][page] ?? page}`;
}
