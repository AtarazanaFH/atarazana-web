---
name: revisar-marea
description: Prepara el panel privado para revisar quién entra en una marea. Saca los invitados de Luma, marca como categoría 0 a quien ya vino según la Tripulación, investiga a la gente nueva con subagentes y genera un HTML local. Úsala cuando la persona pida revisar inscripciones, candidatos o invitados de una marea, o el "panel" de una marea.
---

# Revisar las inscripciones de una marea

El resultado es un HTML (`panel-marea-NNN.html`) con todas las personas inscritas. Ahí se etiquetan del 1 al 3 y se exporta un CSV. **Es de uso interno y lleva datos de personas.** Ese HTML y todo lo que se genera para él viven fuera del repo, en `~/.atarazana/revision/`, y no se suben a GitHub, no se publican como artifact y no se comparten. El script `scripts/revision/marea.mjs` se niega a escribir dentro del repo.

## Reglas de entrada

- **Categoría 0:** quien ya vino a una marea anterior, según `mercado_attendance` de la Tripulación. Entra sin revisar y no se etiqueta.
- Si la categoría 0 no cabe entera en las plazas (`capacity` en `src/data/mareas.ts`), entra por **orden de inscripción**. La primera que se apuntó tiene la primera plaza; el resto queda «en espera».
- Las plazas que deja libres la categoría 0 son para gente nueva. Esas personas se etiquetan en el panel: 1 entra, 2 quizá, 3 no.
- Una persona nueva que se llama igual que alguien que ya vino sale con el aviso «¿Ya vino con otro correo?». No entra sola en la categoría 0: lo decide la persona.
- **Historial.** No cambia la categoría; solo se marca en la lista, en la ficha, en el filtro «Historial» y en el CSV:
  - **No entró** (verde agua): se apuntó en Luma a una marea anterior y no fue aprobada (pendiente, lista de espera o rechazada).
  - **No vino** (luz de faro): fue aprobada y no vino. Sale de `no_fue` en el CSV de asistencia de Drive, con su motivo («lo avisó por correo»), o de estar aprobada en Luma sin constar en la Tripulación.
- Los correos de `~/.atarazana/revision/equipo.json` (el equipo) salen atenuados como «Tu inscripción» y no se investigan.

## Flujo

Sustituye `NNN` por el número de la marea (`002`). Todo se ejecuta desde la raíz del repo. Usa las herramientas equivalentes disponibles en el harness para acceder a Luma y Drive, buscar en la web y escribir archivos locales. Si falta un conector, pide la exportación correspondiente; no des por hecho que otro harness comparte su configuración o su sesión.

1. **Invitados de Luma.** Saca el `evt-…` del enlace `luma` de la marea en `src/data/mareas.ts` con `lookup_entity`. Después, llama a `list_guests` con `limit: 50`, sin filtro de estado. Guarda el JSON de la respuesta en `~/.atarazana/revision/NNN/luma.json`: el objeto con `entries` o el array de invitados, sin el envoltorio del conector. Si la herramienta devuelve un archivo local, extrae de él el JSON sin volcar la lista entera en el chat. Si hay `has_more`, pide la siguiente página con `cursor` y guárdala como `luma-2.json`, `luma-3.json`…
   **Historial de las mareas anteriores.** Para cada marea anterior (`MMM`), tiene que haber dos archivos en `~/.atarazana/revision/MMM/`. Si falta alguno, `preparar` avisa:
   - `luma.json` (y `luma-2.json`…): su lista de Luma completa, bajada **después** de la marea para que los estados sean los finales. Se saca igual que en el paso 1, con el `evt-…` de esa marea.
   - `asistencia.csv`: el CSV de asistencia de esa marea (`Marea MMM.csv`). Está en la carpeta de Drive cuyo id guarda `~/.atarazana/revision/config.json` (`driveAsistencia`). Búscalo en esa carpeta con el conector de Drive, lee su contenido y guárdalo como archivo local. Columnas: `email,name,approval_status,checked_in_at,origen`; `approval_status` es `approved` (vino) o `no_fue`. Si el conector añade escapado de Markdown, quítalo (`\_` → `_`).
2. **Preparar:** `node scripts/revision/marea.mjs preparar NNN`. Lee la asistencia de producción **solo con SELECT** desde `.env.prod` y no escribe nada en la base de datos. Calcula la categoría 0 y deja en `pendientes.json` a las personas nuevas sin ficha. Las plazas salen de `mareas.ts`; para cambiarlas, `--plazas N`.
3. **Investigar** a las pendientes (ver abajo). Si no queda ninguna, salta al paso 4.
4. **Enriquecer:** `node scripts/revision/marea.mjs enriquecer NNN`. Guarda las fichas de los agentes en `~/.atarazana/revision/fichas/` y completa de forma automática el GitHub, la web, la bio de X y las fotos. Si GitHub limita las peticiones, exporta `GITHUB_TOKEN` (por ejemplo, `GITHUB_TOKEN=$(gh auth token)`).
5. **Generar:** `node scripts/revision/marea.mjs generar NNN`. Escribe `~/.atarazana/revision/NNN/panel-marea-NNN.html`. Dale a la persona la ruta absoluta. **No uses `html_render`, `html_preview` ni Artifact con este archivo**, porque lo subirían fuera de su ordenador.
6. **Resume** en el chat: cuántas personas hay inscritas, cuántas son de categoría 0 (y cuántas esperan), cuántas plazas quedan para gente nueva y cuántas personas nuevas hay, de ellas cuántas ya se apuntaron antes y no entraron, y cuántas entraron y no vinieron. Avisa también si alguien sale con «¿Ya vino con otro correo?».

Las fichas se reutilizan entre mareas. Quien se apuntó a la 001 y no entró ya tiene ficha y no se vuelve a investigar. Para rehacer una ficha, borra `fichas/<email>.json` y vuelve al paso 2. La primera vez se sembraron desde el panel de la 001 con `node scripts/revision/marea.mjs sembrar <panel.html> 001`.

## Investigación

Reparte `pendientes.json` en lotes de 4 o 5 personas y lanza un subagente por lote con las herramientas de delegación disponibles, en paralelo hasta el límite del harness. Si no admite subagentes, investiga los lotes tú mismo y guarda los mismos archivos. Cada uno escribe su resultado en `~/.atarazana/revision/NNN/investigacion/lote-K.json`. Encargo para cada subagente (cambia el lote y la ruta):

> Investiga a estas personas, que se han apuntado a un encuentro de gente que construye tecnología en Málaga. Queremos saber a qué se dedican y qué han construido, para decidir quién entra. Usa las herramientas disponibles de búsqueda y lectura web: sus perfiles de X, LinkedIn, GitHub y su web (los de Luma vienen en la lista), sus proyectos, sus charlas y la prensa. Busca por nombre y ciudad cuando no haya enlaces. **Si no estás seguro de que un perfil es de esa persona, no lo uses.** Mejor una ficha corta que una ficha con datos de otra persona. No inventes nada. No escribas a nadie, no te registres en ningún sitio y no hagas nada más que leer.
>
> Escribe en un archivo local un array JSON en `<ruta>`, con un objeto por persona:
> `{ "email", "name" (nombre completo si lo encuentras), "role" ("Cargo · Empresa", corto), "kind" (de 1 a 3, el principal primero, de esta lista: founder, ingeniería, IA, research, producto, diseño, seguridad, hardware, comunidad, early employee, estudiante, otro; [] si no se sabe), "summary" (2 o 3 frases en castellano, concretas: qué hace, qué ha construido, con datos), "links" (hasta 4 cosas destacables: proyectos, charlas, artículos, una línea cada una), "sources" (URLs que has usado), "x", "li", "gh", "web" (URL completa o ""), "photos" ([{ "src": "linkedin" | "web" | "x" | "github", "url": URL directa de una imagen donde se le vea la cara }], solo si estás seguro) }`.
> Al acabar, contesta solo con cuántas fichas has escrito y cuántas personas no has podido identificar.
>
> Personas: <el JSON del lote>

Después revisa por encima que los archivos son JSON válidos y sigue con el paso 4.

## Lo que no se hace nunca

- Subir a git los datos de invitados, las fichas, las fotos o el panel, ni copiarlos dentro del repo.
- Publicar el panel o enseñarlo con herramientas que lo suban (artifact, `html_render`).
- Aprobar, rechazar, invitar o escribir a nadie en Luma sin que la persona lo pida de forma expresa (ver AGENTS.md, sección 4, Luma).
- Escribir en la base de datos de la Tripulación. Este flujo solo la lee.
- Poner en el chat los datos personales que no hagan falta: basta con recuentos y nombres.
