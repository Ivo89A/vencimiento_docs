# Autenticación y autorización

Entradas principales:
- `src/domains/auth/auth.ts`: Better Auth lazy, Prisma adapter con transacciones.
- `src/domains/auth/authorization.ts`: sesión y carga fresca de permisos/alcance.
- `src/domains/auth/access-policy.ts`: política pura, denegación por defecto.
- `src/app/api/auth/[...all]/route.ts`: endpoints reales de autenticación.
- `scripts/create-user.ts`: provisión inicial sin registro público ni credenciales predeterminadas.

Las contraseñas se hashean con scrypt mediante Better Auth. Sesiones en PostgreSQL, 8 horas,
cookies seguras en producción, sin cache cliente de permisos. Recuperación: enlace de un solo
uso, TTL 30 minutos y revocación de sesiones al cambiar contraseña. Configurar SMTP antes de probarla.
El envío usa `after` de Next.js, no un Promise abandonado. Los fallos se registran sin incluir
tokens, URLs de recuperación ni credenciales. La recuperación exige volver a solicitar enlace
si falla SMTP; su reintento durable se abordará junto con notificaciones.

Se conservan las comprobaciones de origen/CSRF de Better Auth. Las APIs de negocio exigen
Origin igual a `BETTER_AUTH_URL` en mutaciones. Login y recuperación tienen rate limits de BD.
El proxy únicamente redirige navegación sin cookie; cada operación servidor valida sesión,
cuenta activa, permiso y alcance, incluso si se invoca por URL/API directa.

El generador de IDs de autenticación es una función UUID explícita. No usar el literal
`generateId: "uuid"` sin revisar esquema: el adapter PostgreSQL puede delegar esa generación
a la BD, pero estas columnas TEXT no tienen DEFAULT SQL. Esta diferencia se detectó y
corrigió mediante E2E real, no con autenticación simulada.

## Roles iniciales
El comando de provisión crea permisos y roles al necesitarse. Administrador obtiene permisos
actuales y alcance global. Visualizador recibe lecturas y asignaciones expresas, no auditoría
ni escrituras. Los permisos de archivos y su separación vista/descarga se agregan con el motor.

## Límites actuales
El alcance inicial es por razón social; el alcance por entidad individual y UI de roles están
pendientes. No publicar todavía este sistema como una entrega completa. No activar plugins
de roles externos sin integrar y probar la política de negocio existente.
