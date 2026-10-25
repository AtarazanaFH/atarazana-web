import type { Locale } from './pages';

// Logos en monocromo --white (#e8f3f1), recortados al borde, en public/assets/partners/.
export interface Partner {
  name: string;
  url: string;
  logo: { src: string; width: number; height: number };
  line: Record<Locale, string>;
}

export const partners = {
  segurosia: {
    name: 'SegurosIA',
    url: 'https://www.segurosia.com/',
    logo: { src: '/assets/partners/segurosia.png', width: 585, height: 387 },
    line: { es: 'Agentes de IA para seguros', en: 'AI agents for insurance' },
  },
} satisfies Record<string, Partner>;

export type PartnerId = keyof typeof partners;
