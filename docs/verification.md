# Verificación de la primera entrega — 31/10/2026

## Alcance implementado
Skills instaladas localmente, arquitectura, esquema empresarial inicial, base funcional y
primer CRUD de razones sociales. No es la aceptación integral del sistema documental.

## Evidencia ejecutada
- Seis skills copiadas: 106 archivos idénticos por SHA-256; origen usado solo en lectura.
- Prisma validate y generación de cliente: aprobados.
- Dos migraciones aplicadas desde cero en dos bases separadas de PostgreSQL 18.6 real.
- 59 unitarias aprobadas.
- 11 pruebas de integración PostgreSQL aprobadas.
- 8 E2E Playwright aprobados, sin omisiones: Chromium escritorio y Pixel 7 emulado.
- Typecheck y lint aprobados, sin advertencias del linter.
- Build Next.js aprobado, sin requerir secretos ni conexión a BD.
- Audit de dependencias productivas: 0 alertas reportadas. Completo: 12 moderadas transitivas.

Instalación limpia `npm ci`: aprobada, sin force ni legacy-peer-deps. Después se repitieron
typecheck, lint, 59 unitarias y build: aprobados. También se repitió el harness completo con
esa resolución: 11 de integración y 8 E2E aprobados, sin omisiones. SMTP y PostgreSQL detenidos al finalizar.

## Comportamientos comprobados
- Alta, consulta, edición y baja lógica con persistencia real.
- CUIT único, validación de entrada y rechazo de campos no permitidos.
- Cambio de versión y rechazo de edición concurrente obsoleta.
- Rollback del alta si no se puede persistir la auditoría.
- FK compuesta que impide asociar tienda y estación de empresas distintas.
- Restricción de baja con entidades hijas activas.
- Alcance aplicado antes de listar y contar; otro alcance responde 404.
- Visualizador consulta lo asignado y obtiene 403 al intentar escribir por API.
- Mutación de origen no autorizado responde 403; sin sesión responde 401.
- Selección de empresa y descarga efectiva de CSV, no un botón decorativo.
- Exportación filtrada y autorizada; fórmulas de planillas neutralizadas.
- Login/logout, protección de navegación y menú móvil.
- Recuperación mediante SMTP local real, cambio de contraseña, rechazo de contraseña anterior,
  sesión anterior revocada y token no reutilizable.
- Rate limiting de login devuelve 429 bajo intentos repetidos.

## Incidencias reproducidas y corregidas
1. Instalación inicial interrumpida por timeout: se conservó la instalación parcial en el
   temporal, se resolvió nuevamente sin force y se verificó la aplicación.
2. Prisma latest apuntaba a RC: se alinearon versiones estables 7.10.1.
3. TypeScript 7 excedía el rango de typescript-eslint: se fijó 5.9.3.
4. pg_ctl conservaba pipes heredados en Windows: se detuvo el cluster propio y se corrigió
   stdio del harness. No se instalaron servicios de Windows.
5. UUID de Better Auth delegado a BD sin DEFAULT: generador de UUID explícito, comprobado por E2E.
6. Formulario de edición: se separaron metadatos ID/versión de los valores validados.
7. E2E móvil requería abrir navegación antes de logout; navegación cerrada ahora invisible
   también para tecnologías de asistencia, no solamente desplazada fuera de pantalla.
8. Agregado ESLint legacy con peers incompatibles y alternativa EOL: se usaron plugins
   oficiales explícitos con ESLint 10. Instalación sin force/legacy-peer-deps.
9. `npm ci` detectó que los peers opcionales de @hookform/resolvers 7 producían un lockfile
   inconsistente con npm 10. Se fijó 5.2.2 estable compatible y la instalación limpia pasó.

## No verificado / pendiente (actualizado con el primer hito documental)
- Módulos funcionales de tiendas y rodados (solo tablas iniciales disponibles).
- Presentaciones documentales, cargas S3, cuarentena/antimalware, visor, renovaciones y aprobaciones.
- Cálculo documental de vencimientos, calendario, dashboard completo y worker de alertas.
- Reportes PDF/Excel, administración visual de usuarios/roles y configuración dinámica.
- Alcance por entidad individual, portal documental y carga desde cámara real.
- SMTP externo, entregabilidad de dominio, PostgreSQL permanente, S3 y despliegue productivo.
- Pentest, auditoría WCAG completa, restauración de backups y pruebas de carga.

Las bases y credenciales de QA son efímeras; los procesos se detuvieron al terminar el harness.
No se dejó un usuario demo ni un servidor PostgreSQL de prueba como aplicación productiva.

## Segunda entrega — estaciones

Módulo operativo implementado y verificado, sin confundirlo con gestión documental:
- API y pantallas de alta, consulta, edición, baja lógica y reactivación.
- Estado operativo independiente: operativa, temporalmente fuera de servicio, cerrada.
- Selector paginado de empresas con búsqueda, cancelación de respuestas antiguas y reintento.
- Filtros, orden, paginación, selección y CSV real protegido con permiso propio.
- Historial administrativo, enlaces desde empresa y acceso desde navegación/inicio.
- Transferencias auditadas, sin cascada implícita sobre tiendas.
- Restricción de alta/activación bajo empresa inactiva y de baja con tiendas activas.
- Mutaciones Serializable, control de versión y auditoría transaccional.

Verificación final de esta entrega:
- 86 unitarias, 29 de integración PostgreSQL y 10 E2E aprobados, sin omisiones.
- Tres migraciones aplicadas desde cero en ambas bases aisladas de PostgreSQL 18.6.
- Typecheck, lint, Prisma validate y build aprobados; sin dependencias nuevas.
- Lecturas de 10 y 100 estaciones observadas en el driver real: consultas acotadas,
  sin una consulta adicional por fila. No se reemplazó SQL ni resultados.
- Audit de dependencias productivas: 0 alertas reportadas.

La primera ejecución E2E detectó un problema de selección en tabla móvil. Se corrigió
la experiencia con tarjetas táctiles, manteniendo una sola representación y sin forzar clics.
La repetición pasó en escritorio y móvil emulado, incluida selección y descarga CSV.

El hito documental posterior agrega obligaciones desde estaciones. Siguen pendientes adjuntos
privados, visor, presentaciones, semáforo documental y vencimientos, en el motor común.
Reglas y contratos: `docs/stations.md`. Por nuevo pedido del usuario se priorizan los hitos
documentales antes de retomar tiendas y rodados.

## Primer hito documental — verificado
- Catálogo común, configuración versionada y asignación de obligaciones; UI y API reales.
- Registro documentable con FK concreta, integridad de subtipo y de razón social en SQL.
- Preservación de requisitos al cambiar configuración o desactivar tipos; transferencias con
  obligaciones bloqueadas. Campos personalizados tipados con validación estricta de servidor.
- 103 unitarias aprobadas. Typecheck, lint, Prisma validate y build aprobados.
- Segunda ejecución: 50 pruebas de integración aprobadas; incluye backfill sobre entidades
  existentes, asignación/transferencia y revisiones concurrentes, rollback de auditoría y alcance.
- Los dos E2E documentales pasaron; la ampliación de la suite activó el rate limit real en
  un escenario posterior de estaciones. Se aisló la limpieza de fixtures en la base E2E local;
  no se modificaron los límites de producción ni se omitió la prueba de HTTP 429.
- Repetición final completa: **103 unitarias, 50 de integración PostgreSQL y 12 E2E aprobados,
  sin omisiones**. Typecheck, lint, validación Prisma y build aprobados.
- Audit de dependencias productivas: 0 avisos. No se agregaron dependencias.
- Se aplicó la migración 004 a la vista local preservando sus 3 empresas y 4 estaciones;
  quedaron 7 registros documentables. No se sembraron tipos/requisitos ficticios.
- Se observa una advertencia de deprecación de `pg` por consultas concurrentes desde la capa
  Prisma/adaptador. No es un error de lint ni un fallo de prueba; no se ocultó ni se actualizó
  el stack a una versión mayor para silenciarla.

Infraestructura del siguiente hito comprobada: no hay Docker/ClamAV en PATH ni S3/antivirus
configurados en el entorno actual. El hito de archivos privados no está implementado ni probado.
El usuario eligió usar sus servicios existentes. Preparación: `docs/document-storage-setup.md`.

## Cierre de ajustes posteriores a la revisión
- La estación se conserva al crear, revisar o cancelar configuración; el guardado vuelve
  al catálogo filtrado por código para que el registro recién creado quede visible.
- La búsqueda del catálogo compara código o nombre de última revisión, con SQL parametrizado,
  escapado literal de comodines y el mismo predicado antes de contar/paginar.
- Las asignaciones existentes se obtienen en un lote acotado y autorizado. El catálogo
  muestra "Ya asignado" y un enlace con ID a la obligación, no un botón duplicado.
- Definido contrato de adopción en `document-configuration-adoption.md`; su operación/historial
  siguen pendientes del hito 3. Ninguna revisión ni migración existente fue modificada.
- Verificación final: **103 unitarias, 53 de integración y 12 E2E aprobados**, sin omisiones;
  typecheck, lint y build aprobados. No se agregaron dependencias ni migraciones.
- La prueba documental ya no salta manualmente al catálogo después de crear el tipo:
  comprueba contexto, asignación única, enlace de obligación, revisión y búsqueda vigente.
- Tres vueltas adicionales por enlaces en escritorio y móvil no reprodujeron las esperas,
  ni generaron HTTP 5xx.
- Diagnóstico local posterior: los scripts inline enviados por PowerShell a stdin de Node
  perdían el acento de "Documentación". Se comprobó que el literal recibido difería de
  `Documentaci\u00f3n`. Repitiendo el recorrido con selectores Unicode seguros pasó la
  navegación Inicio → Documentación → Tipos → Obligaciones, sin modificar datos empresariales.
  Era un problema del script de diagnóstico, no un fallo de navegación de la aplicación.
- Para futuros smoke scripts en Windows, preferir archivos UTF-8 o escapes Unicode en los
  literales enviados por pipes; los E2E persistidos ya usan archivos UTF-8 y pasaron.
- El usuario confirmó después que no dispone todavía de S3 ni antimalware. La infraestructura
  del hito 2 debe provisionarse; no se presentó una carga ni un análisis simulado como operativo.

## Hito 2 — adaptadores y diagnóstico (entrega parcial)
- Implementados SDK S3 oficial fijado, almacenamiento en cuarentena, integridad acotada,
  cliente ClamAV INSTREAM privado y resolución DNS validada sin segunda resolución.
- Diagnóstico opt-in `files:check`: configuración sin red; red solo contra infraestructura
  aislada no productiva; EICAR adicional explícito. No habilita cargas ni modifica políticas.
- Instalación limpia `npm ci` aprobada. Typecheck, lint y build aprobados; 184 unitarias aprobadas.
- Dependencias productivas: 0 avisos reportados. Auditoría completa conserva 12 avisos moderados
  de desarrollo/transitivos conocidos; no se ejecutó `audit fix --force`.
- Pruebas nuevas: fixtures HTTP con el SDK real, TCP de protocolo y resolver DNS controlado.
  No representan S3 desplegado, motor ClamAV real ni detección EICAR real.
- `npm run files:check` sin configuración falla correctamente, mostrando solo nombres de
  variables ausentes. No se contactaron servicios externos ni se escribieron objetos reales.
- Regresión final: 53 de integración PostgreSQL y 12 E2E aprobados, sin omisiones; cuatro
  migraciones aplicadas a ambas bases aisladas. Sin cambios de esquema/UI ni datos del cliente.
- CLI comprobado por subprocess con configuración de fixture: `--network` se bloquea en
  producción y sin confirmación aislada antes de crear clientes. No se contactó un proveedor.
- Pendiente: provisionar y probar infraestructura real; modelo de adjuntos/presentaciones,
  carga autorizada, validación real de formatos, jobs/reconciliación, visor y renovaciones.
  No hay endpoint de carga ni se considera completado el hito 2.
