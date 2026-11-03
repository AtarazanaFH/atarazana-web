# La Tripulación · puesta en marcha

En el código, las tablas y los scripts se llama «mercado», su nombre anterior.

Directorio privado de la gente que ha venido a las mareas. La web sigue siendo estática;
el login (enlace mágico), los datos y las fotos van en [Supabase](https://supabase.com) (plan gratis).

## Una vez

1. **Crear el proyecto** en supabase.com (región Europa). El de producción está en `eu-west-1`.
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql`. Se puede volver a ejecutar si cambia.
3. **Authentication → Sign In / Providers**
   - Email: activado. **"Allow new users to sign up": desactivado** (solo entra quien invitamos).
4. **Authentication → URL Configuration**
   - Site URL: `https://atarazana.house/tripulacion`
   - Redirect URLs: `https://atarazana.house/tripulacion`, `https://atarazana.house/en/tripulacion` (y las antiguas `/mercado` y `/en/mercado`, que redirigen ahí)
5. **Correo con Gmail (obligatorio).** El correo de serie de Supabase solo manda a miembros del equipo y unos pocos por hora. Usamos la cuenta `atarazanafh@gmail.com` como servidor de correo (unos 500 correos al día, gratis).
   - En la cuenta de Google: activa la **verificación en dos pasos** (Seguridad) y crea una **contraseña de aplicación** en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) con el nombre "Supabase". Son 16 letras: guárdalas, solo se ven una vez.
   - Supabase → **Authentication → Emails → SMTP Settings** → activar *Enable custom SMTP*:
     host `smtp.gmail.com`, puerto `465`, usuario `atarazanafh@gmail.com`, contraseña = la contraseña de aplicación (sin espacios), remitente `atarazanafh@gmail.com`, nombre `Atarazana Founder House`.
   - Supabase → **Authentication → Rate Limits**: deja "emails per hour" en 100. Cuenta los enlaces que pide la gente para entrar; las invitaciones las manda el script directamente con Gmail. No lo subas mucho más: Gmail corta hacia los 500 al día, y ese tope incluye las dos cosas.
   - Si algún día se quiere remitente `@atarazana.house`, se cambian estos campos por los de [Resend](https://resend.com) (host `smtp.resend.com`, usuario `resend`, contraseña = API key, tras verificar el dominio en DNS). No hay que tocar código.
6. **Plantillas**: Authentication → Emails → Templates. Copia `emails/magic-link.html` en *Magic Link* (el asunto va en el comentario del archivo). `emails/invite.html` no se pega en Supabase: la manda `scripts/mercado.mjs` con Gmail, usando `GMAIL_APP_PASSWORD` de `.env.prod`. Así la cuenta nace confirmada y la invitación dura 30 días y sirve una vez: su botón lleva a `/tripulacion`, que la canjea en la función `mercado-invite` y deja a la persona dentro de un clic. Deja de valer al usarla o al rellenar el perfil. Si ya no vale, se pide un enlace en `/tripulacion`, y ese dura una hora (Authentication → Email OTP Expiration: 3600). Para publicar la función: `SUPABASE_ACCESS_TOKEN=… npx supabase functions deploy mercado-invite --project-ref qdjgqywjqwulzblafnof --no-verify-jwt --use-api`. Las imágenes de los correos están en `public/assets/email/`, así que tienen que estar publicadas antes de enviarlos. La tarjeta de la invitación se pinta para cada persona, con su correo (`scripts/mercado-card.mjs`). Necesita Chromium: `npx playwright install chromium-headless-shell`, una vez. Si cambia el nombre "La Tripulación", hay que cambiarlo en esa tarjeta y regenerar `titulo-invitacion.png` (hoy dice "Sube a bordo").
7. **Claves** (Project Settings → API):
   - En **Vercel → Settings → Environment Variables**: `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`. Redeploy.
   - En tu ordenador, copia `.env.prod.example` a `.env.prod` y rellénalo, incluida la `SUPABASE_SERVICE_ROLE_KEY`. **Esa clave salta todas las reglas: nunca en Vercel, nunca en el repo.**
8. **Función de la invitación**: publica `mercado-invite` con el comando del paso 6.
9. **Admin**: `atarazanafh@gmail.com` es admin siempre (lo pone `schema.sql`). `node scripts/mercado.mjs admin atarazanafh@gmail.com --prod` le manda la invitación.

## Producción se cuida

- `npm run dev` solo habla con el Supabase local (`.env.development.local`). Si ahí apareciera la URL de producción, la Tripulación no se conecta y avisa en la consola. Y la web publicada nunca se conecta al local.
- `scripts/mercado.mjs` trabaja en local por defecto. Producción solo con `--prod`, que lee `.env.prod` y pide escribir el nombre del proyecto antes de escribir nada. `--dry-run` no toca ninguna base de datos.
- `scripts/mercado-demo.mjs` se niega a funcionar si no es contra localhost.
- El esquema de producción se aplica a mano en el SQL Editor o, con `SUPABASE_ACCESS_TOKEN` en `.env.prod`, por la API de gestión (ver "Acceso de agentes" en `AGENTS.md`). No uses `supabase link` ni `supabase db push`.

## Después de cada marea

1. Luma → evento → Guests → **Export** (CSV).
2. `node scripts/mercado.mjs import 002 ruta/al.csv --dry-run` para ver a quién va a cargar.
3. `node scripts/mercado.mjs import 002 ruta/al.csv --prod` → guarda la asistencia e invita a quien aún no tiene cuenta. A quien ya tenía cuenta solo se le suma la marea.

Con `--no-invite` guarda la asistencia y no manda nada. Para invitar después, repite el comando sin esa opción.
Por defecto solo carga a quien hizo **check-in**. Con `--all`, a todos los aprobados.
Si un correo falla, el comando termina con error y la invitación queda pendiente: repite el mismo comando y solo se reintentan esas. Borrar una cuenta borra también su invitación.
`node scripts/mercado.mjs list 002 --prod` enseña quién consta en una marea.

## Copias de seguridad

El plan gratuito de Supabase no hace copias. Las hace `.github/workflows/backup.yml`: cada lunes guarda las cuentas, las tablas de la Tripulación y las fotos, y las conserva 90 días como artefacto de GitHub.

**El repo es público, así que cualquiera con cuenta en GitHub puede descargar esos archivos.** Por eso van cifrados con [age](https://github.com/FiloSottile/age): GitHub solo tiene la clave pública, y descifrar requiere la privada, que está fuera de GitHub y del repo. **Si se pierde la clave privada, las copias no se pueden abrir.** Los registros solo muestran recuentos.

Preparación, una vez:

1. `sudo apt install age` y `age-keygen -o clave-copias.txt`, fuera del repo. Guarda ese archivo en un gestor de contraseñas. Lo que empieza por `age1…` es la clave pública.
2. En `.env.prod`: `SUPABASE_DB_URL=postgresql://postgres.qdjgqywjqwulzblafnof:CONTRASEÑA@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`. La contraseña está en Supabase → Project Settings → Database. Si hay que cambiarla, mejor solo con letras y números. No va en el chat.
3. En GitHub, el entorno `backup`, limitado a la rama `main`, con los secretos `SUPABASE_DB_URL` y `SUPABASE_SERVICE_ROLE_KEY` y las variables `SUPABASE_URL` y `BACKUP_AGE_RECIPIENT`.

Se lanza a mano en Actions → Backup → Run workflow. Si una copia falla, GitHub lo avisa por correo. GitHub puede desactivar las tareas programadas tras 60 días sin actividad en el repo: conviene mirar de vez en cuando que siguen saliendo.

Para restaurar, descarga el artefacto de Actions y:

```sh
mkdir copia && age -d -i clave-copias.txt mercado.tar.gz.age | tar -xz -C copia
node scripts/mercado-restore.mjs copia          # local, para comprobar la copia
node scripts/mercado-restore.mjs copia --prod   # producción: pide confirmación
```

`mercado-restore.mjs` se niega si el destino tiene cuentas o datos. Trae las cuentas, los perfiles, la asistencia, las invitaciones, los admins y las fotos. Las tablas y las reglas salen de `schema.sql`, que hay que aplicar antes en un proyecto nuevo. La carpeta `copia` lleva datos personales sin cifrar: bórrala al acabar.

## Qué ve cada uno

- **Solo existen cuentas de correos que están en la lista de asistentes** (o de admins). Lo impide un disparador en la base de datos: ni con un enlace, ni con la API, ni con la clave secreta se crea una cuenta de otro correo. Por eso el script guarda la asistencia antes de invitar.
- **El perfil necesita nombre y al menos un enlace** (web, LinkedIn, X o GitHub), para que te puedan escribir. Lo comprueba también la base de datos.
- **Para ver a los demás hay que tener el perfil relleno y sin modo incógnito.** Sin él, solo se ve cuántas personas hay en tus mareas y el botón para rellenarlo. Si ocultas tu perfil, dejas de ver a los demás. Los admins ven todo sin perfil propio.
- Cada persona ve los perfiles visibles de quien coincidió con ella en alguna marea, y puede filtrar por sus mareas. Su propio perfil sale el primero, marcado con «Tú». No cuenta en «Has coincidido con otras N personas».
- Quien no ha rellenado su perfil (o lo ha ocultado) sale **de incógnita**: solo se ve a qué marea fue, ni nombre ni correo.
- Los **admins** pueden **borrar el perfil** de cualquiera desde su ficha (por ejemplo, si no cuenta nada). Se borran el perfil y sus fotos, no la cuenta: la persona puede volver a entrar, pero tiene que rellenarlo otra vez para ver a nadie.
- Los **admins** ven todas las mareas, el correo en cada ficha y pueden descargar un CSV con todos los perfiles rellenados (también los ocultos, marcados con `visible = false`).
- Las tablas no se pueden leer directamente desde el navegador: todo pasa por las funciones de `schema.sql`, que aplican estas reglas en la base de datos.
- Las fotos van a un bucket privado, recortadas a 480×600 en el navegador antes de subirlas. Una foto solo se puede leer si puedes ver la ficha de su dueño.

## Probar en local

Con Docker: `npx supabase start -x vector,logflare,realtime,imgproxy,supavisor`, aplica `schema.sql`
(`docker cp supabase/schema.sql supabase_db_atarazana-web:/tmp/s.sql && docker exec supabase_db_atarazana-web psql -U postgres -f /tmp/s.sql`)
y `node scripts/mercado-demo.mjs` crea 21 personas de prueba en las mareas 001–003 y enseña enlaces para entrar.
Las claves locales van en `.env.development.local` (no se sube). Buzón de prueba: http://127.0.0.1:54334.

Tests de los recorridos y permisos críticos: `npm test`. Preparación y alcance en [`tests/README.md`](../tests/README.md). `npm run verify` añade la comprobación de tipos de Astro y Deno y el build.

## Borrar a alguien

Supabase → Authentication → Users → borrar el usuario (se borra su perfil en cascada) y,
si hace falta, sus filas de `mercado_attendance` desde Table Editor y su carpeta en Storage → `mercado-fotos`.
