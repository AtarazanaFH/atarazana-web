# Tests de El Mercado

Siete pruebas de comportamiento con el runner de Node, Supabase local y Chromium. Sin dependencias nuevas.

```sh
npm test        # Mercado: unos 15 segundos con los servicios arrancados
npm run verify # tipos de Astro y Deno, tests y build
```

## Antes de cada commit y en GitHub

El hook `.githooks/pre-commit` ejecuta `npm run verify`. Si algo falla, Git cancela el commit. Debe estar instalado en cada clon: `npm install` y `npm ci` lo instalan automáticamente mediante `prepare`. Para instalarlo en un clon que ya tenga las dependencias:

```sh
npm run hooks:install
git config --get core.hooksPath # debe devolver .githooks
```

Arranca Supabase local y prepara Chromium como se indica abajo antes de hacer commit. El hook comprueba el árbol de trabajo; incluye en el commit los cambios que has verificado. Corrige los fallos en lugar de omitir el hook.

El workflow `.github/workflows/verify.yml` ejecuta la misma verificación en cada push y PR, y admite ejecución manual. Prepara Node 22, Chromium y Supabase CLI 2.122.0, arranca una base local temporal, aplica `schema.sql` y sirve `mercado-invite`. Genera las claves locales en el runner: no necesita secretos de Supabase, Gmail ni Vercel. El hook no se instala dentro de CI, donde se llama a `verify` directamente.

Vercel sigue desplegando desde GitHub según la configuración existente del proyecto. Este workflow aporta la comprobación `Verify`; para exigirla antes de fusionar, añádela como comprobación obligatoria en las reglas de la rama de GitHub.

| Archivo en `mercado/` | Qué protege |
| --- | --- |
| `access.test.mjs` | Alta solo para asistentes; perfil y contacto obligatorios; privacidad por marea e incógnito; acceso directo a tablas, fotos, exportación y moderación. |
| `invitations.test.mjs` | El canje autentica al destinatario una sola vez, incluso con dos peticiones simultáneas. Caducidad y revocación al completar el perfil o borrar la cuenta. |
| `import.test.mjs` | CSV con duplicados y check-in, dry-run sin escrituras, fallos de BD y SMTP, recuperación al repetir el comando y ausencia de reenvíos a quien ya recibió la invitación o entró. `--no-invite` no crea cuentas ni envía, y una opción desconocida no escribe ni envía. |
| `migration.test.mjs` | Las invitaciones antiguas siguen constando como enviadas. Reaplicar el esquema conserva los pendientes nuevos. |
| `card.test.mjs` | El correo cabe en la primera tarjeta, con su tipografía real. Sin snapshots de píxeles. |
| `browser.test.mjs` | Entrar desde la invitación, completar el perfil, abrir el directorio y una ficha, y cerrar sesión; castellano e inglés, texto de BD como texto y ancho de 360 px. |

## Preparación

Node ≥ 22.12, Docker local y las dependencias de `npm ci`. Una vez, instala el navegador:

```sh
npx playwright install chromium-headless-shell
```

Arranca Supabase **incluyendo Edge Runtime** y aplica el esquema actual:

```sh
npx supabase start -x vector,logflare,realtime,imgproxy,supavisor
docker exec -i supabase_db_atarazana-web psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/schema.sql
```

En `.env.development.local` hacen falta `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`, todas del proyecto local. Ambas URL deben ser iguales, normalmente `http://127.0.0.1:54321`. `npx supabase status` muestra los valores locales. La función `mercado-invite` debe estar disponible en ese servidor; si no está sirviéndose, ejecuta `npx supabase functions serve mercado-invite` en otro terminal.

Si cambias SQL, vuelve a aplicar `supabase/schema.sql` antes de ejecutar los tests. El test de migración usa el archivo actual, pero los demás prueban las reglas que tenga cargadas Supabase.

No hace falta arrancar Astro: el test de navegador crea su servidor en un puerto libre y lo cierra. El canje y la autenticación son reales; solo se adapta el destino local de la redirección de Auth a ese puerto. El SMTP de pruebas también usa un puerto libre y descarta los mensajes; no necesita Gmail ni el buzón de Supabase.

## Datos y mantenimiento

Los tests solo leen `.env.development.local`, rechazan URL que no sean localhost y crean correos aleatorios bajo `example.invalid`. Limpian sus cuentas, perfiles, invitaciones, asistencia y fotos incluso si una aserción falla. No borran los datos de la demo. La prueba de migración usa el contenedor local `supabase_db_atarazana-web` por el socket local de Docker: recrea la tabla antigua y aplica el esquema dentro de una transacción que acaba en `ROLLBACK`.

Ejecuta la suite en serie, como hace `npm test`; no lances dos copias a la vez. Si matas el proceso a la fuerza, no puede garantizarse la limpieza. Si falta un servicio, el test falla: no se omite en silencio.

Para trabajar en un caso concreto:

```sh
node --test tests/mercado/import.test.mjs
```

Los helpers solo crean datos, arrancan recursos y provocan fallos. Las reglas de acceso se prueban con clientes autenticados normales, no con la service key. El importador se ejecuta como CLI y la función se llama por HTTP. El único fallo de BD simulado intercepta una inserción en el subproceso; no modifica el código de producción.

Añade un caso cuando proteja una regla de acceso, un recorrido importante o reproduzca un fallo real. No hace falta probar cada helper, contar llamadas internas ni congelar el HTML o los textos. Los errores de tipos se cubren con `verify`, no con tests que busquen cadenas en los archivos.
