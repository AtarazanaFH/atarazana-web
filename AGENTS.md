# AGENTS.md — Atarazana

Guía para cualquier agente (o persona) que escriba código, textos o diseño en este repo. Antes de tocar copy o estilos, lee entero el apartado de **Voz** y el de **Identidad visual**.

---

## 1. Qué es Atarazana

Una comunidad recurrente, pequeña y con invitación para la gente que construye tecnología en Málaga: founders, ingenieros de software, research e IA, producto, diseño, primeros empleados de startups y estudiantes que ya tienen proyectos funcionando.

- Unas 45 personas por encuentro (la Marea 001 fue de 30), cada vez en un sitio distinto de Málaga. Las plazas de cada marea están en `src/data/mareas.ts`.
- Gratis para quien viene. Los gastos los pagan empresas partners, que no deciden quién entra, quién habla ni de qué se habla.
- Lo que importa es lo que haces, no el cargo.

**La referencia no es una startup ni un evento tech. Es una institución cultural independiente para personas que construyen tecnología.**

### De dónde viene el nombre

*Atarazana* viene del árabe andalusí *dār aṣ-ṣināʿa*, que significa **"casa de la industria"** o "casa del oficio": el sitio donde se fabrica. Las Atarazanas nazaríes de Málaga (siglo XIV) eran los astilleros donde se construían los barcos que cruzaban el Mediterráneo. Del edificio solo queda la **Puerta**, que hoy es la entrada al Mercado de Atarazanas. *Arsenal* viene de la misma palabra árabe.

Esa es nuestra historia y nuestro vocabulario: oficio, taller, astillero, mar, Málaga. Ha cambiado el material. La actitud es la misma.

---

## 2. Voz

### Principios

- **Directa y llana.** Frases cortas. Verbos antes que sustantivos. Nada de "sinergias", "ecosistema disruptivo", "networking de alto nivel".
- **Concreta.** "Unas 45 personas", "3 de diciembre", "algo para picar". Mejor un dato que un adjetivo.
- **Corta.** Si una frase se entiende sin su última coletilla, se quita. Una idea por frase; lo que ya se dijo en otro bloque no se repite.
- **Honesta.** Si algo no está decidido, se dice ("Tema por anunciar"). Nada de urgencia falsa ni FOMO.
- **De oficio, no de cargo.** Se habla de lo que la gente hace y construye, nunca de estatus, seguidores o títulos.
- **Selectiva sin ser exclusiva.** La invitación existe para cuidar la mezcla de la sala, no para crear élite.
- **Cercana.** Tuteo siempre. Castellano de España, con Málaga presente pero sin caer en el tópico.

### Nuestro lenguaje propio

Tenemos un vocabulario propio, sacado del astillero y de Málaga, para no sonar como otras comunidades del mismo formato (en especial Barraca, en València). **La regla de oro: que nadie se pierda.** Si un término necesita explicación para entenderse, o no se usa o se explica en la misma frase. Pocos términos, bien elegidos, y el resto en castellano llano.

#### Decisiones tomadas (3 de octubre de 2026)

**En uso en la web:**

| Dónde | Término | Por qué encaja |
|---|---|---|
| Botón principal (antes "Solicita invitación") | **Pide paso** | Se entiende solo y conecta con la Puerta |
| Primer paso de "Cómo entrar" | **Pide paso por la Puerta** | La Puerta es lo único que queda de las Atarazanas y hoy es la entrada al Mercado. Se explica en el propio texto: "Como en las antiguas Atarazanas, se entra por la Puerta" |
| Nombre de cada encuentro (antes "Session 001") | **Marea 001** | La marea vuelve con regularidad, como queremos que vuelva la gente. Se explica junto al bloque del próximo encuentro: "Cada encuentro es una marea: vuelve cada poco". En inglés se queda "Marea" como nombre propio. **Hay que renombrarlo también en Luma, X y LinkedIn** |
| Footer y despedidas | **Hasta la próxima marea** | La marea vuelve con regularidad, como queremos que vuelva la gente |
| Footer, descripciones | **Comunidad de gente que construye tecnología en Málaga** | Nuestra forma de decirlo, sin depender de "builders" |
| Manifiesto, capítulo 1 | **"Aquí ya se construía"** | La historia propia (astillero, siglo XIV) en lugar de la idea de "poner Málaga en el mapa" |
| Manifiesto, "Por qué este nombre" | **dār aṣ-ṣināʿa** y **arsenal** | La etimología: "casa de la industria". *Arsenal* viene de la misma palabra |
| Metadatos en mono | **s. XIV** | Junto a las coordenadas: footer y pie de la Puerta |
| Directorio de asistentes (`/tripulacion`) | **La Tripulación** (3 de noviembre de 2026; antes, El Mercado) | La gente que ha subido al mismo barco. Se entiende mejor que "El Mercado". En inglés también se dice "La Tripulación". En mitad de frase, "la Tripulación" ("Volver a la Tripulación"). El nombre está en `tripulacionName` (`src/data/tripulacion.ts`); si cambia, se cambia ahí, se renombran las carpetas `src/pages/tripulacion` y `src/pages/en/tripulacion`, se añade la redirección en `vercel.json` y se regenera `titulo-invitacion.png`. En la base de datos sigue siendo "mercado": ver "Nombres antiguos" en la sección 4 |
| Visual | **Lacería** y **la Puerta** | Ver "Elementos secundarios" en la sección 3 |

**Se mantiene como estaba:**

- **Invitación.** El objeto se sigue llamando invitación (la tarjeta, "Te llega la invitación", "¿Por qué hay que pedir invitación?"). Solo la acción de pedirla es "Pide paso".
- **"Comunidad de builders".** Se queda solo en los títulos y descripciones SEO (`src/data/pages.ts`), porque es como nos busca el público. La etiqueta del hero se quitó el 31 de octubre de 2026 para simplificar la portada: el hero empieza directamente con el título. En el resto de textos, mejor "gente que construye".
- **"¿Quieres enseñar algo?"** y "demo". Se entienden perfectamente; no hace falta un término propio.
- **El nombre "Atarazana Founder House" se mantiene** (decidido el 3 de octubre de 2026), aunque se parezca a "Barraca Founders House". La diferencia la marcan el texto y la identidad, no el nombre.
- **En inglés**, el botón sigue siendo "Request an invite": "Pide paso" no tiene traducción natural. La despedida es "Until the next marea". **En inglés se dice siempre "marea", nunca "tide"** (decidido el 1 de noviembre de 2026). Se queda en castellano, con mayúscula en el nombre de cada encuentro ("Marea 001", "First Marea"). La única excepción es la aclaración que explica la palabra: "We call each meetup a marea, Spanish for tide".

**Convenciones de estilo:**

- Fechas en castellano con el mes en minúscula: "29 de octubre" (en la invitación va en mayúsculas por diseño). En inglés, "29 October".
- En inglés, "Builder community" (no "Builders community") y "Spots" para las plazas.
- **Marea sin partner.** Mientras una marea próxima no tenga partners, la web lo dice en tono llano, sin pedir favores: "Esta marea sigue buscando a un partner: una empresa que pague el espacio, la comida y la bebida." / "This marea is still looking for a partner: a company to pay for the venue, food and drinks." En la invitación del hero, la tarjeta lleva una banda verde agua sobre el pie con "Se busca partner" / "Partner wanted" y el número de la marea, y un cuadrado que parpadea. Las dos cosas se activan con `partnerWanted: true` en la marea (`src/data/mareas.ts`); cuando aparezca el partner, se borra esa línea y se añade su id a `partners`.
- No repetir bloques enteros entre páginas: el manifiesto resume y enlaza a la portada en lugar de copiar sus textos.
- **La portada se mantiene ligera** (decidido el 3 de octubre de 2026). Orden: hero con la invitación, bloque de la próxima marea (datos y programa), "Menos networking", y debajo solo cuatro piezas: Qué es (con enlace al manifiesto), Para quién es, Cómo entrar y un bloque corto de partners ("Para empresas": una frase destacada, una línea de explicación y la retícula de partners). Los partners van en general, no por marea: cada uno en una celda con su logo en monocromo `--white` (en `public/assets/partners/`), una línea en mono sobre qué hace y enlace a su web. La última celda es "¿Tu empresa? Cómo ser partner" y enlaza a la página de partners. Cada dato (gratis, 45 personas, programa…) se dice una vez en la portada. Lo que se amplía va en su página: manifiesto, partners y preguntas.

**Descartado:**

- **"en grada"**. No se entiende sin explicación.

**Ideas en reserva** (no usar en la web sin decidirlo antes; útiles para formatos, emails o redes):

| Genérico | Término | Por qué encaja |
|---|---|---|
| Demo, lanzamiento | **botadura** | Botar un barco es echarlo al agua por primera vez |
| Charlas sobre errores | **Derrotas** | La *derrota* es el rumbo de un barco y también perder: el rumbo que tomaste y dónde te equivocaste |
| Empezar una empresa | **poner la quilla** | La quilla es la primera pieza del barco |
| Negocio, métricas | **línea de flotación** | Cuándo un producto empieza a mantenerse solo |
| Crisis, incidentes | **achique** | Sacar el agua que entra: cómo seguir a flote |
| Equipo organizador | **contramaestres** | Organiza el trabajo a bordo pero no es el dueño: servicio, no estatus |
| "¿Puedo llevar a alguien?" | **polizones** | "Aquí no hay polizones, pero sí hay sitio: que pida paso" |
| Comunidad recurrente | **la cuadrilla** | Los equipos de astillero; en Andalucía la palabra sigue viva |
| Contador de asistencias | **Llevas 3 mareas** | Cuántas veces has venido, sin rankings ni puntos |

La cuadrilla queda en reserva: la Tripulación (ya en uso, ver arriba) ocupa ese sitio.

### Lo que evitamos en el texto

Para no calcar a Barraca ni a otras *founder houses*:

- ❌ "las mismas caras", "mismas caras, nuevas ideas", "que las caras dejen de ser desconocidas"
- ❌ "los grandes eventos ponen una ciudad en el mapa", "un ecosistema vive de lo que pasa entre eventos" y variantes → ✅ la historia propia: el astillero, el siglo XIV, la Puerta
- ❌ "builders" como palabra para todo → ✅ "gente que construye" (salvo en SEO, ver arriba)
- ❌ "Build / Connect / Demo / Repeat". Quitado de la web (barra superior, invitación y banda de "Menos networking") el 3 de octubre de 2026; no hay lema en inglés.
- ❌ Tono de feria o de LinkedIn: "hacer contactos", "oportunidades únicas", "exclusivo", "top talent"
- ❌ Dinámicas de networking forzadas, rondas de tarjetas, charlas comerciales

> Nota: el informe de identidad visual original usa algunas de estas frases como ejemplos de tono ("MISMAS CARAS. NUEVAS IDEAS.", "BUILD / CONNECT / DEMO / REPEAT"). Este documento las sustituye.

### Frases de referencia

Valen como muestra del tono y se pueden reutilizar:

- "Menos networking. Más conversaciones."
- "Una demo vale más que un pitch."
- "Un lanzamiento a medias da mejor conversación que una historia de éxito pulida."
- "Gente de oficio, no de cargo."
- "En el siglo XIV, Málaga construía barcos. Hoy construye tecnología."
- "Hasta la próxima marea."

---

## 3. Identidad visual

Basado en el *Informe de identidad visual*. En una frase: **editorial neo-brutalista en clave marina: fondo azul abisal, tipografía condensada a gran escala, verde agua como señal, fotografía documental en blanco y negro y detalles técnicos, para una comunidad underground de gente que construye tecnología en Málaga.**

Fórmula: `EDITORIAL ABISAL + TIPOGRAFÍA MASIVA + VERDE AGUA SEÑAL + PERSONAS REALES + MÁLAGA + LENGUAJE TÉCNICO`

> La paleta original del informe era negro y rojo. El 3 de octubre de 2026 se cambió a la **paleta marina** (del astillero al mar): `--red` pasó a `--signal` y `--acid` a `--beacon`. Donde el informe diga "rojo", léase verde agua (`--signal`). **No hay rojo en la web.**

### Personalidad

- **Técnica.** Precisión, sistemas, estructura, documentación.
- **Underground.** Algo de crudeza, como un cartel cultural o una publicación independiente. Nada corporativo.
- **Local.** Arcos, piedra, luz mediterránea, puerto. Sin símbolos turísticos evidentes.
- **Selectiva.** Más club o comunidad reconocible que evento masivo.
- **Centrada en quien construye.** Las personas y los proyectos van en el centro.
- **Directa.** Mensajes cortos, tipografía grande, jerarquía clara.
- **Limpia.** Densa en tipografía, pero sin ruido de interfaz: nada de etiquetas que repiten lo que ya dice el título de la sección, índices que no ayudan a moverse ni decoración en mono que no informa (se quitaron "+ A-01", la barra superior de coordenadas, los "Próxima / Pasada" del catálogo y el índice "01 Programa / 02 Partners" de cada marea).

### Color

Los tokens viven en `src/styles/global.css`. Usa siempre las variables, nunca valores sueltos.

| Token | Valor | Uso |
|---|---|---|
| `--black` | `#061418` | **Fondo dominante:** azul abisal. También el texto sobre la señal y sobre la luz de faro |
| `--black-2` | `#0a1d22` | Bandas (`.band`), CTA final, fondo de la invitación. El alma de la lacería va en este color |
| `--anthracite` | `#10292f` | Superficie elevada: solo en hover (filas de mareas, celdas de partners) |
| `--structure` | `#1e3a40` | Líneas de retícula, bordes, divisiones. Verde petróleo |
| `--cement` | `#8aa6aa` | Texto secundario y metadatos: niebla marina |
| `--white` | `#e8f3f1` | Tipografía y logotipo: espuma |
| `--signal` | `#34e0c2` | **Acento principal:** verde agua. Palabras destacadas de los titulares, CTA, flechas, etiquetas, números de sección, el bloque "Menos networking", la banda de la Puerta |
| `--deep` | `#0b4a4a` | Texto destacado **sobre** `--signal`, donde el blanco no se lee (la segunda línea de "Menos networking") |
| `--beacon` | `#ffcf5c` | Luz de faro. Interrupción puntual y con moderación: estado "Invitaciones abiertas", borradores, foco de teclado (`:focus-visible`) |
| `--blue` | `#4c9aff` | Excepcional, para detalles técnicos. Hoy no se usa |

Reparto: grandes superficies azul abisal y fotografía en blanco y negro como base, espuma para el texto y el verde agua como único acento claramente dominante. La luz de faro aparece poco y solo para estados que hay que ver (abierto, borrador, foco). El azul, casi nunca.

- Sobre `--signal` o `--beacon` el texto va en `--black`. El hover de un bloque de color pasa a `--white`.
- La invitación del hero es papel claro (`--white`) con texto `--black`: es la única superficie clara de la web.
- Fuera de los tokens solo hay valores derivados para piezas concretas: `#50686c` en las etiquetas de la invitación, `#163038` en la cinta de la lacería del hero, `rgba(6, 20, 24, …)` para líneas sobre el verde agua y la onda del audio en `rgba(52, 224, 194, …)`. No añadas más sin necesidad.

### Tipografía

| Rol | Fuente | Variable | Uso |
|---|---|---|---|
| Display | Anton | `--font-display` | Titulares en mayúsculas, gran escala, interlineado apretado, alguna palabra en verde agua (`.hl`) |
| Cuerpo / interfaz | Inter Variable | `--font-body` | Lectura y navegación |
| Mono | IBM Plex Mono | `--font-mono` | Fechas, coordenadas, categorías, números de sección, etiquetas, botones |
| Mano | Permanent Marker | `--font-hand` | Anotaciones puntuales sobre la composición (hoy, el "¿Tú?" de la invitación). Nunca para texto largo |

### Composición y geometría

- Retícula editorial **visible**: líneas finas, líneas horizontales largas, módulos rectangulares. Las divisiones forman parte del diseño.
- Composiciones asimétricas y grandes masas tipográficas. Las piezas pueden ser densas.
- Geometría ortogonal: **`border-radius: 0`**. Los círculos solo en indicadores, controles o diagramas.
- Los elementos forman una única superficie editorial. **Nada de tarjetas flotantes.**
- Las agendas y los programas van en filas separadas por líneas, como una programación editorial: `FECHA — TÍTULO — DESCRIPCIÓN — CATEGORÍA — LUGAR — DIRECCIÓN`.

### Logotipo

- Monograma **AH**, geométrico, compacto y con mucho peso visual. Se lee como inicial y como estructura arquitectónica.
- Combinaciones: espuma sobre abisal, abisal sobre verde agua, abisal sobre espuma y espuma sobre fotografía oscura.
- Monograma solo para avatar, favicon y acreditaciones. Con el nombre completo cuando haga falta identificarse del todo.
- Sin degradados, sombras, volumen, glow ni efectos.

### Fotografía

- Es la prueba de que la comunidad existe, no decoración.
- Temas: gente construyendo, ordenadores y demos, mesas pequeñas, ponentes, arquitectura, piedra, arcos, Málaga.
- Tratamiento: blanco y negro, alto contraste, grano sutil, encuadre documental con recortes fuertes. Se puede conservar alguna vez la luz cálida de Málaga.
- Escala humana: tiene que parecer un grupo pequeño que se reúne a menudo, no un congreso.
- Intervenciones gráficas: flechas, anotaciones, subrayados, bloques en verde agua.

### Elementos secundarios

Flechas, crosshairs, coordenadas (`36.7202° N / 4.4214° W`, solo en el footer, el catálogo de mareas y el pie de la Puerta), marcas de registro, subrayados, círculos y diagramas, anotaciones a mano y, como recurso propio, **lacería nazarí** (líneas que se entrelazan) para patrones, separadores y fondos. Siempre en segundo plano: nunca sustituyen a la tipografía ni a la fotografía.

Recursos propios de Atarazana (ya en la web):

- **Lacería nazarí**: *lazo de ocho* trenzado, con estrellas de ocho puntas formadas por **cintas dobles que pasan alternativamente por encima y por debajo** en cada cruce. Eso es lo que la hace nazarí: sin cinta y sin trenzado solo es un patrón geométrico. Se construye sobre la retícula de octógonos y cuadrados (método de Hankin, ángulo 67,5°). El alma de la cinta va pintada con el color del fondo (`#0a1d22`, `--black-2`), así que solo funciona sobre ese fondo. Se usa en el fondo de la invitación del hero (tesela de 120 px, cinta `#163038`) y en la clase `.laceria` para bandas separadoras (tesela de 64 px, cinta `#1e3a40`, `--structure`; hoy, encima del CTA final). Nunca protagonista.
- **La Puerta**: la Puerta de las Atarazanas (s. XIV, Muhammad V) dibujada en línea a partir de su fachada actual vista de frente. Tiene un cuerpo central más alto con almenas y friso de arquillos, alas laterales con ventana de herradura, un dintel adovelado sobre el arco, alfiz, un arco de herradura apuntado con dovelas que convergen en la imposta, venera en la clave y dos escudos terciados en banda (la banda, en `--signal`). Sin árboles, rejas ni personas: solo la arquitectura. Componente `src/components/Puerta.astro`, con pie en mono. Hoy está en el capítulo "Por qué este nombre" del manifiesto.
- **Metadatos**: `36.7202° N / 4.4214° W · Málaga / ES · s. XIV`. Ya no hay barra superior ni coordenadas en la invitación.

Texturas como cemento, piedra, papel, fotocopia o ruido, siempre contenidas. No es grunge.

### Movimiento

Discreto y mecánico: flechas que se desplazan, subrayados que aparecen, cambios de contraste, bloques que se mueven un poco, imágenes que se revelan. Easing `--ease`, duraciones de 0.15 a 0.45 s. Toda animación va dentro de `@media (prefers-reduced-motion: no-preference)`. La animación nunca es el centro del diseño.

### Territorios que evitamos

- **Startup / SaaS:** tarjetas redondeadas, gradientes suaves, iconos amables y genéricos, ilustraciones vectoriales.
- **Web3 / cyberpunk:** neón, hologramas, fondos espaciales, estética gaming. Ojo con el verde agua: es un color plano de señal marítima, nunca con glow, degradado ni brillo.
- **Evento corporativo:** fotos de stock, escenarios de conferencia, retratos muy producidos, estética de feria.
- **Networking tradicional:** asociación empresarial, "hacer contactos", tono institucional o comercial.

### Qué la hace reconocible sin logo

1. Fondo azul abisal, casi negro
2. Tipografía condensada a gran escala
3. Verde agua como señal
4. Fotografía documental en blanco y negro
5. Retícula editorial visible
6. Detalles técnicos y arquitectónicos

---

## 4. El repo

- **Astro 7**, sitio estático desplegado en Vercel (`vercel.json`). Node ≥ 22.12.
- Comandos: `npm run dev`, `npm run build`, `npm run check`, `npm run check:functions` (la función de Supabase va aparte porque es Deno).
- Tests de la Tripulación: `npm test`, siempre contra Supabase local. Preparación y alcance en `tests/README.md`. `npm run verify` comprueba tipos, tests y build. Añade casos para fallos reales o reglas críticas; evita tests que solo repitan la implementación.
- **Antes de hacer commit:** el hook `.githooks/pre-commit` ejecuta `npm run verify` y bloquea el commit si falla cualquier comprobación. **El hook debe estar instalado en cada clon:** `npm install` / `npm ci` lo instalan mediante `prepare`; también se instala con `npm run hooks:install`. Comprueba que `git config --get core.hooksPath` devuelve `.githooks`. Supabase local y Chromium deben estar preparados según `tests/README.md`. Corrige los fallos antes de repetir el commit; no omitas el hook con `--no-verify` ni desactivándolo. GitHub Actions ejecuta la misma verificación en cada push y PR (`.github/workflows/verify.yml`).
- Páginas en `src/pages/` (castellano en la raíz, inglés en `src/pages/en/`). **Cualquier cambio de copy se hace en los dos idiomas.**
- Metadatos SEO y sociales por página e idioma en `src/data/pages.ts`. Allí también está `pageUrl` y el mapa de rutas que cambian según el idioma (la página `faq` es `/preguntas` en castellano y `/en/faq` en inglés).
- Los textos de los componentes (`Header`, `Footer`, `FinalCTA`, `MareaRow`, `MareaPage`…) están en un objeto `es`/`en` dentro de cada componente.
- **Menú** (`Header.astro`): Mareas · Manifiesto · Partners · Preguntas · Luma (perfil `luma.com/user/atarazana`) · EN/ES · botón "Pide paso". Se mantiene corto: antes de añadir algo, mira si puede ir en el footer.
- **Enlaces a Luma:** "Pide paso", "Invitaciones abiertas" y el botón de cada marea próxima llevan al evento de esa marea (`luma` en `mareas.ts`). El perfil general solo va en el menú y en el catálogo vacío.
- **Mareas** (`src/data/mareas.ts`): cada encuentro es una entrada (número, fecha, plazas, charlas, partners). De ahí salen la invitación del hero, el bloque de la próxima marea, el CTA final, el catálogo `/mareas` (`/en/mareas`) y la página de cada marea (`/mareas/001`). Para crear una marea nueva, se añade una entrada al principio del array. Con `draft: true` solo se ve en `npm run dev`; mientras no haya ninguna publicada, el catálogo no se genera ni sale en el menú ni en el footer. Si la marea ya ha pasado, se marca como pasada en el siguiente build: en ese momento se puede añadir `venue`, `doors` y una crónica en `body`. Cada ponente con cartel necesita también su retrato en `public/assets/speakers/thumbs/` (400×500, blanco y negro, recortado del cartel sin texto): sale en la fila del catálogo y en la banda de ponentes.
- **La Tripulación** (`/tripulacion`, `/en/tripulacion`; `/mercado` redirige ahí desde `vercel.json`, porque las primeras invitaciones llevan a `/mercado`): directorio privado de asistentes con login por enlace mágico, en Supabase. Solo pueden tener cuenta los correos de la lista de asistentes o de admins. Para ver a los demás hay que tener el perfil propio relleno y visible. Cada persona ve los perfiles de quien coincidió con ella en alguna marea, y el suyo el primero, marcado con «Tú»; quien no ha rellenado el suyo sale "de incógnita". Los admins lo ven todo y descargan CSV. **`atarazanafh@gmail.com` tiene que ser admin siempre**: lo pone `schema.sql` y no se quita. La invitación es de un clic: un token de un solo uso (30 días) que `/tripulacion` canjea en la función `supabase/functions/mercado-invite`; el enlace que se pide desde la web dura una hora. Las reglas de acceso viven en la base de datos (`supabase/schema.sql`), nunca solo en el navegador. **Producción se cuida:** en local todo va contra el Supabase local; los scripts solo tocan producción con `--prod` y confirmación (ver `supabase/README.md`). Cliente en `src/scripts/tripulacion.ts`, textos en `src/data/tripulacion.ts`, carga de asistentes desde el CSV de Luma con `scripts/tripulacion.mjs`. Puesta en marcha y uso en `supabase/README.md`. Las fotos van en color. El texto de la base de datos se pinta siempre con `textContent`, nunca como HTML.
- **Nombres antiguos: «mercado».** La Tripulación se llamó El Mercado hasta el 3 de noviembre de 2026. La web, los scripts, los tests y la documentación ya dicen «tripulacion». Lo que sigue llamándose «mercado» vive en producción y **no se renombra**, aunque parezca un resto:
  - **Base de datos** (`supabase/schema.sql`): las tablas `mercado_admins`, `mercado_attendance`, `mercado_invites` y `mercado_profiles`, sus funciones (`mercado_directory`, `mercado_person`, `mercado_can_see`…), triggers y políticas. El esquema usa `create table if not exists`: cambiar ahí los nombres no renombra nada, crea tablas nuevas vacías al lado de las que tienen los datos.
  - **Fotos:** el almacén `mercado-fotos` (`PHOTO_BUCKET` en `src/lib/supabase.ts`). Supabase no deja renombrar un almacén; habría que copiar todas las fotos.
  - **Invitación:** la función `supabase/functions/mercado-invite` y su variable `MERCADO_SITE_URL`. Canjea las invitaciones ya enviadas: si cambia de nombre sin publicar a la vez la web y la función, los enlaces pendientes dejan de funcionar.
  - **Direcciones `/mercado` y `/en/mercado`:** las redirecciones de `vercel.json` y las URLs permitidas en Auth (`supabase/config.toml` y producción). Las primeras invitaciones llevan ahí.
  - **Copias de seguridad** anteriores al 5 de noviembre de 2026: se llaman `mercado-N` (`mercado.tar.gz.age`). Se restauran igual, con `scripts/tripulacion-restore.mjs`.
  - El **Mercado de Atarazanas** del manifiesto y de este documento es el edificio, no el directorio.

  Si algún día se renombra la base de datos, se hace como una migración aparte, con su plan y su aprobación, nunca de paso en otro cambio.
- **Acceso de agentes a producción** (Supabase y Vercel). Los valores están en `.env.prod`, que no se sube al repo; aquí solo va qué hay y cómo renovarlo:
  - Proyecto de Supabase: `qdjgqywjqwulzblafnof` (`https://qdjgqywjqwulzblafnof.supabase.co`).
  - `.env.prod` contiene `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (la secret key, `sb_secret_…`), `SITE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (la publishable, `sb_publishable_…`, no la usa el script), `SUPABASE_ACCESS_TOKEN` (`sbp_…`, token personal con caducidad) `GMAIL_APP_PASSWORD` (con ella `scripts/tripulacion.mjs` manda las invitaciones) y `SUPABASE_DB_URL` (conexión directa, para las copias de seguridad). Se leen sin imprimirlos, y nunca se piden ni se pegan en el chat.
  - **Si el token ha caducado** (la API de gestión responde 401), pídele a la persona que cree otro en [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) y lo guarde en `.env.prod` como `SUPABASE_ACCESS_TOKEN`. Da acceso a todos los proyectos de esa cuenta: pide la caducidad más corta que sirva. Si la persona prefiere no crearlo, el esquema se pega a mano en el SQL Editor.
  - Con el token se usa la API de gestión (`api.supabase.com/v1/projects/<ref>/…`): SQL en `/database/query`, ajustes de login y correo en `/config/auth`. No se usa `supabase link` ni `db push`. Antes de borrar datos o hacer algo que no se pueda deshacer, se pregunta.
  - `scripts/tripulacion.mjs --prod` pide teclear el nombre del proyecto: es una confirmación humana y solo se responde con una aprobación expresa de ese envío.
  - **Copias de seguridad:** `.github/workflows/backup.yml` hace una copia semanal cifrada con `age`, con `scripts/tripulacion-backup.mjs`. El repo es público: la copia nunca se sube sin cifrar, la clave privada nunca va a GitHub ni al repo y los registros solo muestran recuentos. Restaurar en producción (`scripts/tripulacion-restore.mjs --prod`) necesita aprobación expresa. Guía en `supabase/README.md`.
  - **Invitaciones tras cada marea:** la persona pasa el CSV de Luma y pide mandarlas. El agente ejecuta `--dry-run`, explica cuántas personas son y quiénes, y pide aprobación para esa lista. Con la aprobación en esa misma conversación, lanza el `--prod` respondiendo a la confirmación con el nombre del proyecto. La aprobación vale para ese envío, no para los siguientes. Sin ella, le da el comando para que lo ejecute la persona (`! node scripts/tripulacion.mjs … --prod`). No depende del token: usa la secret key y `GMAIL_APP_PASSWORD`.
  - **Cargar asistentes sin invitar:** `import` sin más guarda la asistencia **y manda las invitaciones**. Si la persona pide cargar la lista y enviar más adelante, se usa `--no-invite`: guarda la asistencia, no crea cuentas y no manda nada. Hasta que se les invite, esas personas no pueden entrar. Para invitarlas, se repite el comando sin `--no-invite`, y eso ya es un envío: necesita su propia aprobación. La Marea 001 está cargada así desde el 1 de noviembre de 2026, con las invitaciones sin enviar.
  - **Vercel:** equipo `atarazana-fh`, proyecto `atarazana-web`, cuenta `atarazanafh-3753`. Despliega solo desde GitHub: cada push crea una vista previa y `main` publica la web. Se maneja con la CLI (`vercel`, instalada de forma global) y el plugin de Vercel para Claude Code (skills `vercel:*`).
    - **Comprobar el acceso:** `vercel whoami`. Si no hay sesión, pídele a la persona que ejecute `! vercel login` y apruebe el código en el navegador con esa cuenta. Se cierra con `vercel logout`.
    - **Puesta a punto en otro ordenador:** seguir [vercel.com/get-started.md](https://vercel.com/get-started.md) y, en el repo, `vercel link --yes --project atarazana-web --scope atarazana-fh`.
    - **Ojo con `vercel link`:** crea `.env.local` y añade líneas a `.gitignore`, incluida `.env*`, que deja fuera `.env.prod.example`. Hay que deshacer las dos cosas. Y no se usa `vercel env pull` sin indicar un archivo fuera del repo: `.env.local` es lo que lee Astro en local, y producción no debe llegar ahí.
    - **Variables:** `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`, en Production y Preview. La secret key, el token y la contraseña de Gmail nunca van en Vercel.
- **Partners** (`src/data/partners.ts`): nombre, web, logo y una línea por idioma. La portada enseña todos; cada marea, los suyos.
- Estilos globales y tokens en `src/styles/global.css`. Sigue el estilo existente: CSS plano, propiedades compactas en una línea y variables para todo.
- Accesibilidad: contraste alto, `aria-label` en lo interactivo, respeto a `prefers-reduced-motion`.

---

## 5. Antes de dar algo por terminado

- [ ] ¿El texto suena a Atarazana y no a Barraca ni a una *founder house* genérica? Revisa la lista de "Lo que evitamos".
- [ ] ¿Se entiende sin conocer el glosario? ¿Usa solo términos de "En uso" y no de "Ideas en reserva"?
- [ ] ¿Está en castellano y en inglés?
- [ ] ¿Usa tokens de color y fuente, sin radios ni sombras ni gradientes?
- [ ] ¿El verde agua (`--signal`) es el único acento fuerte de la pieza? ¿La luz de faro aparece solo en estados puntuales?
- [ ] ¿Sobra alguna etiqueta, número o decoración que repite lo que ya se ve?
- [ ] ¿Funciona a 360 px de ancho sin scroll horizontal?
- [ ] ¿`npm run build` pasa?
- [ ] Antes de hacer commit: ¿está instalado el hook y pasa `npm run verify`?
