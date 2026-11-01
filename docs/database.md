# Base de datos inicial

`prisma/schema.prisma` define el esquema; `prisma/migrations/` contiene SQL versionado.

## Relaciones implementadas
- `users`, `sessions`, `accounts`, `verifications`, `rate_limits`: Better Auth.
- `roles`, `permissions`, `user_roles`, `role_permissions`: operaciones permitidas.
- `user_legal_entity_access`: alcance explícito por empresa; `users.allEntities` habilita alcance global.
- `legal_entities`: CUIT único y normalizado, versión optimista, timestamps y estado activo.
- `service_stations`: empresa por FK, código único dentro de esa empresa.
- La tercera migración agrega a estaciones un estado operativo independiente de `active`
  y un índice único por empresa/código normalizado (`upper(btrim(code))`). No normaliza
  destructivamente datos existentes; una colisión requiere resolución explícita.
- `stores`: empresa por FK y estación opcional mediante FK compuesta `(stationId, legalEntityId)`.
- `vehicles`: empresa por FK, patente única y legajo único por empresa.
- `audit_logs`: usuario opcional con FK, recurso, acción, cambios permitidos y timestamp UTC.

Las tablas empresariales usan UUID. Las fechas de eventos son timestamptz. La baja es lógica;
las FK de negocio restringen eliminaciones. El historial no se borra por renovar o desactivar.
Las constraints adicionales e índice de email sin distinción de mayúsculas están en la segunda migración.

## Concurrencia
Ediciones de razones sociales requieren `version`. Una escritura con versión vieja devuelve 409.
Cambios de estado usan transacción Serializable. Las altas, ediciones, transferencias y
activaciones de estaciones ya comparten ese aislamiento. Las futuras mutaciones de tiendas
y rodados también deben preservar la política de dependencias activas.
Una transacción fallida revierte tanto mutación como auditoría.

## Pendiente del motor documental
Tipos y reglas, registro documentable con correspondencia de subtipo, obligaciones, versiones,
adjuntos, aprobaciones, excepciones, campos dinámicos, alertas, preferencias, deliveries y outbox.
No se presentan esas tablas como implementadas hasta generar y probar sus migraciones.
