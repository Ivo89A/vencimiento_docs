# Gestión documental empresarial

Sistema para centralizar documentación y vencimientos de un grupo de estaciones de servicio en Argentina.

**En desarrollo incremental. No está listo para producción ni implementa aún el motor documental.**
El estado exacto y las pruebas están en [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Incluido en la base inicial
- Next.js App Router, TypeScript estricto, Tailwind y componentes reutilizables estilo shadcn/ui.
- PostgreSQL / Prisma con migraciones SQL, FK y restricciones de negocio iniciales.
- Better Auth: sesiones en BD, login/logout, registro público deshabilitado, recuperación SMTP.
- Permisos persistidos extensibles, alcance por razón social y denegación por defecto.
- Razones sociales: API y pantallas de alta, consulta, búsqueda, filtro, orden, paginación,
  edición con control de versión, activación/desactivación, exportación CSV filtrada e historial administrativo.
- Auditoría de mutaciones empresariales en la misma transacción.
- Primer hito documental: catálogo y revisiones configurables, campos tipados, reglas por
  subtipo, asignación de obligaciones y consulta autorizada desde estaciones. Verificación
  vigente en `IMPLEMENTATION_PLAN.md`; no incluye todavía archivos ni vencimientos.
- Base de infraestructura documental: adaptador S3 privado, cliente ClamAV y comando
  `npm run files:check`. Aún no habilita cargas: faltan servicios reales y el flujo de adjuntos.
- Estaciones: API y pantallas de alta, detalle, edición, baja lógica y reactivación, estado
  operativo independiente, filtros, selección, CSV, historial y asociación empresarial segura.

Las tablas de tiendas y rodados están preparadas, **no sus módulos funcionales**.
No hay páginas ficticias para documentación, dashboards, reportes o calendario.

## Requisitos
- Node.js 22.19 o una versión LTS compatible posterior y npm.
- PostgreSQL 16 o posterior, con una base vacía dedicada al proyecto.
- SMTP para recuperación de acceso.
- Para fases posteriores: S3 privado, análisis antimalware y worker programado.

## Instalación (PowerShell)
```powershell
npm.cmd ci
Copy-Item .env.example .env
```
Editá `.env`: configurá `DATABASE_URL`, `BETTER_AUTH_URL` y generá un secreto propio:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
Guardalo en `BETTER_AUTH_SECRET`, nunca en Git. No usar valores de ejemplo en producción.

```powershell
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run user:create -- --name "Administrador" --email "tu-email@tu-dominio.com" --role "Administrador"
npm.cmd run dev
```
El comando solicita una contraseña de 12 a 128 caracteres sin mostrarla. No pasar contraseñas
como argumentos, porque quedarían en el historial o en la lista de procesos. En automatización
se admite `CREATE_USER_PASSWORD` desde el gestor de secretos; eliminarla del entorno al terminar.
La cuenta no existe hasta ejecutar el procedimiento. No hay accesos predefinidos.

Para crear un visualizador, primero creá una razón social y usá su UUID:
```powershell
npm.cmd run user:create -- --name "Consulta" --email "consulta@tu-dominio.com" --role "Visualizador" --legal-entity "UUID-DE-LA-RAZON-SOCIAL"
```
Se puede repetir `--legal-entity`. El visualizador no recibe escritura ni alcance global.
La interfaz de administración de usuarios se implementará en la fase 5; hoy el alta es por CLI
operativa, que requiere acceso autorizado al entorno del servidor.

## Migraciones
```powershell
npm.cmd run db:validate
npm.cmd run db:migrate -- --name descripcion_del_cambio
npm.cmd run db:deploy
```
Usar `db:migrate` solo en desarrollo con la base sombra correspondiente. En producción usar
`db:deploy`, previo respaldo y revisión SQL. No usar `db push` para desplegar.

## Configuración y documentación
- [Arquitectura y seguridad](docs/architecture.md)
- [Modelo de datos inicial](docs/database.md)
- [Estaciones: reglas y alcance](docs/stations.md)
- [Autenticación y permisos](docs/authentication.md)
- [Almacenamiento y notificaciones](docs/infrastructure.md)
- [Pruebas](docs/testing.md)
- [Dependencias y compatibilidad](docs/dependencies.md)
- [Evidencia y límites de esta entrega](docs/verification.md)
- [Despliegue](docs/deployment.md)
- [Continuidad para agentes](docs/HANDOFF.md)

## Verificaciones
```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```
Pruebas de integración requieren `TEST_DATABASE_URL`, con una base dedicada que contenga `test`
en el nombre. Ver [docs/testing.md](docs/testing.md). No ejecutar contra producción.

## Skills
Se copiaron las seis skills pedidas en `.agents/skills`, con sus archivos auxiliares.
La carpeta externa de origen no fue modificada. MUI se conserva como referencia, no se mezcla
con la biblioteca visual del proyecto. Instrucciones específicas de CIMA no son reglas de este producto.
