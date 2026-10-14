# ChiLife

ChiLife es un panel mensual para dar seguimiento equilibrado a ejercicio, trabajo, estudio, alimentación y ahorro, y apartar una recompensa personal.

## Requisitos

- Node.js 20.9 o posterior
- MongoDB Atlas

## Configurar MongoDB Atlas

1. Crea una base de datos en MongoDB Atlas y agrega la IP del entorno donde se desplegará la aplicación a su lista de acceso.
2. Crea un usuario de base de datos con permisos sobre la base `chilife`.
3. Copia `.env.example` a `.env`, reemplaza `DATABASE_URL` con la cadena de conexión SRV de Atlas y genera un valor aleatorio de al menos 32 bytes para `AUTH_SECRET`. Puedes obtenerlo con:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

4. Instala dependencias, genera el cliente Prisma y sincroniza el esquema:

   ```bash
   npm install
   npm run db:generate
   npm run db:push
   ```

5. Inicia la aplicación con `npm run dev`; para producción, usa `npm run build` y `npm start`.

Nunca publiques `.env` ni expongas la cadena de conexión o `AUTH_SECRET`.

## Publicar en GitHub y Vercel

1. Sube el proyecto a un repositorio privado o público de GitHub. El `.gitignore` excluye `.env`, dependencias y archivos de compilación.
2. En Vercel, importa el repositorio. Vercel detecta Next.js y ejecuta el build de producción (`npm run build`).
3. En **Project Settings → Environment Variables**, define `DATABASE_URL` con la cadena SRV de MongoDB Atlas y `AUTH_SECRET` con un secreto aleatorio de al menos 32 bytes. Configúralos para Production y Preview según necesites.
4. En MongoDB Atlas, permite las conexiones desde Vercel. Para una publicación inicial o un cambio del esquema, ejecuta `npm run db:push` desde un entorno confiable con `DATABASE_URL` configurado.
5. Despliega el proyecto y abre el dominio asignado por Vercel.

El comando `db:push` no forma parte del build de Vercel: los cambios de esquema se aplican conscientemente desde un entorno local confiable.
Después de actualizar este cambio, ejecuta `npm run db:push` en un entorno confiable con `DATABASE_URL` configurado para reemplazar en MongoDB el índice único anterior de tareas por fecha.

## Cómo funciona el balance y el regalo

- Cada área tiene una meta mensual; las áreas distintas de Ahorro también tienen un presupuesto editable.
- Ejercicio, estudio y alimentación avanzan automáticamente según el porcentaje completado de cada tarea del día. Trabajo suma un día enfocado cuando cualquier tarea llega al 80%; ahorro se registra manualmente.
- Ahorro tiene una meta monetaria independiente: registras el importe que apartaste y el avance se mide sobre esa cantidad. No tiene presupuesto ni aporta al fondo para el regalo.
- El balance anual usa la media armónica del progreso acumulado de las cinco áreas desde enero hasta el mes seleccionado; así, una sola área muy avanzada no compensa que otra se quede atrás. Para meses sin plan guardado se usan las metas predeterminadas.
- El dashboard muestra el progreso diario (promedio de completitud de las tareas del día seleccionado), mensual y anual. El anual suma el progreso y las metas mensuales desde enero hasta el mes seleccionado.
- Al superar el 80% de una meta con presupuesto (es decir, al alcanzar al menos el 81%), ChiLife aparta el 10% del presupuesto de esa área en el fondo para el regalo del mes.
- Los planes y avances se guardan por mes en MongoDB Atlas. El esquema usa el proveedor MongoDB de Prisma.
- Crea una cuenta con correo y contraseña desde la pantalla de registro; el inicio de sesión usa una cookie firmada y protegida, y las contraseñas se almacenan con hash bcrypt.
- Cada cuenta tiene planes mensuales y tareas propias. Las tareas diarias guardan su fecha, área, descripción, porcentaje completado y estado; se pueden crear, editar, completar o eliminar.
- Se pueden registrar varias tareas por día y por área. Su porcentaje representa la parte realmente completada; por ejemplo, hacer 5 de 10 repeticiones equivale a 50%.
- En ejercicio y estudio, completar al menos 80% de cada tarea suma 1 sesión; desde 50% hasta menos de 80% suma 0.5 sesión; menos de 50% no suma. En alimentación se aplica la misma regla por tarea para los días equilibrados. Trabajo registra un día enfocado cuando cualquier tarea llega al 80%.
- El avance mensual suma el aporte de cada tarea, lo que permite medias sesiones o días equilibrados. Los registros manuales históricos se conservan y no se duplican si ese mismo día ya tiene un registro para el área.
- El avance mensual de **Trabajo** cuenta los días distintos del mes en que la tarea alcanza al menos 80% de completitud.
- Los montos se muestran en soles peruanos (S/).
- Al primer registro, los planes mensuales antiguos que aún no tenían propietario se asocian a esa cuenta para conservar los datos de la instalación previa.
