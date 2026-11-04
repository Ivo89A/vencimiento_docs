# Documentación — catálogo y presentaciones en borrador

- Contratos: `document.schemas.ts` (tipos, reglas, campos, asignación y consultas).
- Lecturas proyectadas/paginadas: `document.queries.ts`.
- Catálogo común, revisiones inmutables, activación: `document-type.service.ts`.
- Asignación autorizada y auditada: `document-requirement.service.ts`.
- API: `/api/document-types`, `/api/document-types/:id`, `/api/document-requirements`.
- UI: `/documentacion`, `/documentacion/tipos`; entrada desde perfil de estación.
- Presentaciones: `document-presentation.schemas.ts`, `document-presentation.service.ts`
  y `document-presentation.queries.ts`; contrato y límites en `docs/document-presentations.md`.

Registro con FK concreta y compuesta por empresa, CHECK de subtipo exacto y triggers
para nuevas entidades. Backfill de datos existentes sin recrearlos. Las transferencias
se bloquean cuando hay obligaciones; una FK compuesta evita cambiar silenciosamente
el alcance sin pasar por el registro. La baja lógica no elimina requisitos.

Catálogo global: `documents:configure` y alcance global. Consulta: `documents:read`.
Asignación: `documents:assign` y alcance sobre empresa, con entidad/empresa/tipo activos.
Las reglas de aplicación definen los subtipos elegibles; no generan obligaciones en masa.
La asignación explícita fija la revisión. Cambiar el catálogo no reevalúa historia ni
modifica obligaciones anteriores. Unicidad por entidad/tipo evita duplicados concurrentes.

El catálogo usa SQL parametrizado para buscar solo la última revisión, seguido de una
lectura proyectada de hasta 20 tipos. Las asignaciones de esa página se obtienen por lote,
intersectadas con el alcance de la entidad. Los enlaces a una obligación usan un filtro
por ID, no el nombre/código ni una colección global para ubicarla.

Campos v1: texto, número finito, fecha ISO civil, booleano. Definiciones JSON versionadas,
validador servidor estricto; los borradores guardan valores según su revisión fijada.

Lecturas sin caché persistente compartida. Después de commit: navegación/refresh del autor;
otras sesiones obtienen datos frescos al navegar/consultar. No hay eventos en tiempo real.

Las presentaciones permiten preparar/editar/cancelar metadatos, no enviar certificados ni
acreditar cumplimiento. Migración 005 aditiva; no modifica revisiones u obligaciones previas.
Pendiente: adjuntos, envío de presentaciones, excepciones, S3 real, antimalware real, visor,
estados, calendario y worker. Los adaptadores S3/ClamAV ya existen en infraestructura.
No agregar URLs públicas ni permitir adjuntos sin análisis para simular ese hito.
Seguimiento y evidencia: `../../../IMPLEMENTATION_PLAN.md`.
