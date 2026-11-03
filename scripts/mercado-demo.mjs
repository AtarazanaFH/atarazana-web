// Datos de prueba para la Tripulación en el Supabase LOCAL (npx supabase start). Nunca en producción.
//
//   node scripts/mercado-demo.mjs          crea la gente de prueba y enseña los enlaces para entrar
//   node scripts/mercado-demo.mjs --reset  borra todo lo de prueba (correos @atarazana.test)
//
// Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.development.local.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

try { process.loadEnvFile('.env.development.local'); } catch {}
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.development.local');
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(SUPABASE_URL)) throw new Error(`Solo contra el Supabase local, no contra ${SUPABASE_URL}`);

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const SITE = 'http://localhost:4321';
const DOMAIN = 'atarazana.test';

// [nombre, mareas, perfil?] · perfil: [rol, empresa, qué construye, enlaces, foto pravatar, visible]
const people = [
  ['Tú (demo)', ['001', '002'], null],
  ['Admin Atarazana', [], null],
  ['Lucía Romero', ['001', '002'], ['Founder', 'Tahona', 'Software para obradores: pedidos, producción y reparto en una sola pantalla.', { website: 'https://tahona.example', linkedin: 'https://www.linkedin.com/in/lucia-romero' }, 47, true]],
  ['Pablo Ortega', ['001'], ['Ingeniero de backend', 'Qamarero', 'Pagos en mesa para restaurantes. Ahora con la parte de cocina.', { github: 'https://github.com/pabloortega' }, 12, true]],
  ['Marta Gil', ['001', '003'], ['Diseñadora de producto', 'Freelance', 'Rediseñando la app de una cooperativa de aceite de la Axarquía.', { website: 'https://martagil.example', x: 'https://x.com/martagil' }, 45, true]],
  ['Javier Molina', ['001'], ['Research en IA', 'Universidad de Málaga', 'Modelos pequeños que corren en el móvil sin conexión.', { github: 'https://github.com/jmolina', website: 'https://jmolina.example' }, 13, true]],
  ['Elena Ruiz', ['001', '002'], ['CTO', 'Varadero', 'Mantenimiento predictivo para barcos de recreo a partir de sensores baratos.', { linkedin: 'https://www.linkedin.com/in/elena-ruiz' }, 44, true]],
  ['Sergio Navas', ['001'], null],
  ['Carmen Vela', ['001'], null],
  ['Andrés Peña', ['001', '002'], ['Indie hacker', null, 'Tres apps de pago en la App Store. La que más factura es un contador de mareas.', { x: 'https://x.com/andrespena', website: 'https://andrespena.example' }, null, true]],
  ['Nuria Campos', ['001'], ['Product manager', 'Freepik', 'Herramientas de IA para diseñadores.', { linkedin: 'https://www.linkedin.com/in/nuria-campos' }, 49, false]],
  ['Diego Fuentes', ['002'], ['Founder', 'Orbita Labs', 'Satélites pequeños con GPUs para entrenar modelos en órbita.', { website: 'https://orbitalabs.example', linkedin: 'https://www.linkedin.com/in/diego-fuentes' }, 59, true]],
  ['Irene Soto', ['002', '003'], ['Ingeniera de datos', 'Clarity AI', 'Pipelines de datos de sostenibilidad. Fuera del trabajo, una app para quedar a remar.', { github: 'https://github.com/irenesoto' }, 32, true]],
  ['Raúl Medina', ['002'], ['Estudiante', 'ETSII Málaga', 'Un compilador de juguete en Rust y un bot que avisa cuando hay sitio en la biblioteca.', { github: 'https://github.com/raulmedina' }, 60, true]],
  ['Alba Torres', ['002'], null],
  ['Hugo Santana', ['002'], null],
  ['Paula Herrera', ['002'], ['Diseño', 'Estudio Lonja', 'Identidades para marcas pequeñas de Málaga.', { website: 'https://estudiolonja.example' }, 9, true]],
  ['Óscar León', ['002', '003'], null],
  ['Laura Cano', ['003'], ['Founder', 'Brisa', 'Climatización inteligente para pisos turísticos.', { linkedin: 'https://www.linkedin.com/in/laura-cano' }, 26, true]],
  ['Miguel Prieto', ['003'], ['Primer empleado', 'Seguros IA', 'Lo que haga falta: ventas, soporte y la mitad del backend.', { linkedin: 'https://www.linkedin.com/in/miguel-prieto' }, 53, true]],
  ['Rocío Delgado', ['003'], null],
];

const email = (name) => `${name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@${DOMAIN}`;
const YOU = email('Tú (demo)');
const ADMIN = email('Admin Atarazana');

async function demoUsers() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`));
}

async function reset() {
  for (const u of await demoUsers()) {
    const { data: files } = await db.storage.from('mercado-fotos').list(u.id);
    if (files?.length) await db.storage.from('mercado-fotos').remove(files.map((f) => `${u.id}/${f.name}`));
    await db.auth.admin.deleteUser(u.id);
  }
  await db.from('mercado_attendance').delete().like('email', `%@${DOMAIN}`);
  await db.from('mercado_admins').delete().like('email', `%@${DOMAIN}`);
  console.log('✓ Datos de prueba borrados.');
}

async function link(address) {
  const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email: address, options: { redirectTo: `${SITE}/tripulacion` } });
  if (error) throw error;
  return data.properties.action_link;
}

await reset();
if (process.argv.includes('--reset')) process.exit(0);

// Primero la lista: la base de datos no deja crear cuentas de correos que no estén en ella.
await db.from('mercado_admins').insert({ email: ADMIN });
await db.from('mercado_attendance').insert(people.flatMap(([name, mareas]) => mareas.map((marea) => ({ email: email(name), marea }))));

for (const [name, , profile] of people) {
  const address = email(name);
  const { data, error } = await db.auth.admin.createUser({ email: address, email_confirm: true, user_metadata: { name } });
  if (error) throw error;
  const id = data.user.id;
  if (!profile) continue;
  const [role, company, building, links, img, visible] = profile;
  let photo = null;
  if (img) {
    try {
      const res = await fetch(`https://i.pravatar.cc/600?img=${img}`);
      if (res.ok) {
        photo = `${id}/${randomUUID()}.jpg`;
        await db.storage.from('mercado-fotos').upload(photo, Buffer.from(await res.arrayBuffer()), { contentType: 'image/jpeg' });
      }
    } catch { photo = null; }
  }
  const { error: pErr } = await db.from('mercado_profiles').insert({ id, name, role, company, building, photo, visible, ...links });
  if (pErr) throw pErr;
}
console.log(`✓ ${people.length} personas de prueba en las mareas 001, 002 y 003.\n`);
console.log(`Entrar como "Tú" (fuiste a la 001 y la 002):\n${await link(YOU)}\n`);
console.log(`Entrar como admin:\n${await link(ADMIN)}\n`);
console.log('Los enlaces sirven una vez. Vuelve a ejecutar el script para tener otros, o pide uno desde /tripulacion con');
console.log(`${YOU} y ábrelo en el buzón de prueba: http://127.0.0.1:54334`);
