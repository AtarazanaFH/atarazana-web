# El Mercado · puesta en marcha

Directorio privado de la gente que ha venido a las mareas. La web sigue siendo estática;
el login (enlace mágico), los datos y las fotos van en [Supabase](https://supabase.com) (plan gratis).

## Una vez

1. **Crear el proyecto** en supabase.com (región Europa, p. ej. `eu-west-3` París).
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql`. Se puede volver a ejecutar si cambia.
3. **Authentication → Sign In / Providers**
   - Email: activado. **"Allow new users to sign up": desactivado** (solo entra quien invitamos).
4. **Authentication → URL Configuration**
   - Site URL: `https://atarazana.house/mercado`
   - Redirect URLs: `https://atarazana.house/mercado`, `https://atarazana.house/en/mercado`, `http://localhost:4321/mercado`, `http://localhost:4321/en/mercado`
5. **Correo con Gmail (obligatorio).** El correo de serie de Supabase solo manda a miembros del equipo y unos pocos por hora. Usamos la cuenta `atarazanafh@gmail.com` como servidor de correo (unos 500 correos al día, gratis).
   - En la cuenta de Google: activa la **verificación en dos pasos** (Seguridad) y crea una **contraseña de aplicación** en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) con el nombre "Supabase". Son 16 letras: guárdalas, solo se ven una vez.
   - Supabase → **Authentication → Emails → SMTP Settings** → activar *Enable custom SMTP*:
     host `smtp.gmail.com`, puerto `465`, usuario `atarazanafh@gmail.com`, contraseña = la contraseña de aplicación (sin espacios), remitente `atarazanafh@gmail.com`, nombre `Atarazana Founder House`.
   - Supabase → **Authentication → Rate Limits**: sube "emails per hour" a 60 o más, para poder invitar a una marea entera de una vez.
   - Si algún día se quiere remitente `@atarazana.house`, se cambian estos campos por los de [Resend](https://resend.com) (host `smtp.resend.com`, usuario `resend`, contraseña = API key, tras verificar el dominio en DNS). No hay que tocar código.
6. **Plantillas**: Authentication → Emails → Templates. Copia `emails/invite.html` en *Invite user* y `emails/magic-link.html` en *Magic Link* (el asunto va en el comentario de cada archivo).
7. **Claves** (Project Settings → API):
   - En **Vercel → Settings → Environment Variables**: `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`. Redeploy.
   - En tu ordenador, copia `.env.prod.example` a `.env.prod` y rellénalo, incluida la `SUPABASE_SERVICE_ROLE_KEY`. **Esa clave salta todas las reglas: nunca en Vercel, nunca en el repo.**
8. **Admin**: `node scripts/mercado.mjs admin atarazanafh@gmail.com --prod` (te llega la invitación).

## Producción se cuida

- `npm run dev` solo habla con el Supabase local (`.env.development.local`). Si ahí apareciera la URL de producción, El Mercado no se conecta y avisa en la consola. Y la web publicada nunca se conecta al local.
- `scripts/mercado.mjs` trabaja en local por defecto. Producción solo con `--prod`, que lee `.env.prod` y pide escribir el nombre del proyecto antes de escribir nada. `--dry-run` no toca ninguna base de datos.
- `scripts/mercado-demo.mjs` se niega a funcionar si no es contra localhost.
- El esquema de producción se aplica a mano en el SQL Editor. No uses `supabase link` ni `supabase db push`.

## Después de cada marea

1. Luma → evento → Guests → **Export** (CSV).
2. `node scripts/mercado.mjs import 002 ruta/al.csv --dry-run` para ver a quién va a cargar.
3. `node scripts/mercado.mjs import 002 ruta/al.csv --prod` → guarda la asistencia e invita a quien aún no tiene cuenta. A quien ya tenía cuenta solo se le suma la marea.

Por defecto solo carga a quien hizo **check-in**. Con `--all`, a todos los aprobados.
`node scripts/mercado.mjs list 002 --prod` enseña quién consta en una marea.

## Qué ve cada uno

- **Solo existen cuentas de correos que están en la lista de asistentes** (o de admins). Lo impide un disparador en la base de datos: ni con un enlace, ni con la API, ni con la clave secreta se crea una cuenta de otro correo. Por eso el script guarda la asistencia antes de invitar.
- **El perfil necesita nombre y al menos un enlace** (web, LinkedIn, X o GitHub), para que te puedan escribir. Lo comprueba también la base de datos.
- **Para ver a los demás hay que tener el perfil relleno y sin modo incógnito.** Sin él, solo se ve cuántas personas hay en tus mareas y el botón para rellenarlo. Si ocultas tu perfil, dejas de ver a los demás. Los admins ven todo sin perfil propio.
- Cada persona ve los perfiles visibles de quien coincidió con ella en alguna marea, y puede filtrar por sus mareas.
- Quien no ha rellenado su perfil (o lo ha ocultado) sale **de incógnita**: solo se ve a qué marea fue, ni nombre ni correo.
- Los **admins** pueden **borrar el perfil** de cualquiera desde su ficha (por ejemplo, si no cuenta nada). Se borran el perfil y sus fotos, no la cuenta: la persona puede volver a entrar, pero tiene que rellenarlo otra vez para ver a nadie.
- Los **admins** ven todas las mareas, el correo en cada ficha y pueden descargar un CSV con todos los perfiles rellenados (también los ocultos, marcados con `visible = false`).
- Las tablas no se pueden leer directamente desde el navegador: todo pasa por las funciones de `schema.sql`, que aplican estas reglas en la base de datos.
- Las fotos van a un bucket privado, recortadas a 480×600 en el navegador antes de subirlas. Una foto solo se puede leer si puedes ver la ficha de su dueño.

## Probar en local

Con Docker: `npx supabase start -x vector,logflare,edge-runtime,realtime,imgproxy,supavisor`, aplica `schema.sql`
(`docker cp supabase/schema.sql supabase_db_atarazana-web:/tmp/s.sql && docker exec supabase_db_atarazana-web psql -U postgres -f /tmp/s.sql`)
y `node scripts/mercado-demo.mjs` crea 21 personas de prueba en las mareas 001–003 y enseña enlaces para entrar.
Las claves locales van en `.env.development.local` (no se sube). Buzón de prueba: http://127.0.0.1:54334.

## Borrar a alguien

Supabase → Authentication → Users → borrar el usuario (se borra su perfil en cascada) y,
si hace falta, sus filas de `mercado_attendance` desde Table Editor y su carpeta en Storage → `mercado-fotos`.
