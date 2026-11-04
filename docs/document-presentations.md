# Presentaciones documentales — metadatos en borrador

## Alcance implementado
Cada obligación permite preparar una presentación con fechas civiles, campos tipados de
su revisión asignada y observaciones. Se puede editar mientras esté en `DRAFT` o cancelar
irreversiblemente a `CANCELLED`, conservando el contenido y el número. No hay eliminación.

**No es una carga documental:** no hay adjunto, envío a revisión, análisis, aprobación ni
certificado efectivo. Los borradores no aportan cumplimiento ni alimentan alertas/calendarios.
La obligación sigue pendiente de evidencia. No se crean objetos S3 en este flujo.

## Entradas
- Listado y creación: `/documentacion/obligaciones/[id]`.
- Detalle, edición y cancelación: `/documentacion/presentaciones/[id]`.
- API GET/POST `/api/document-requirements/[id]/presentations`.
- API GET/PATCH `/api/document-presentations/[id]`.
- Dominio: `src/domains/documents/document-presentation.*`.
- Migración: `202611040005_document_presentations`; no editar la migración 004 aplicada.

POST requiere `requirementVersion`, `requestId` UUID, `issuedOn` y `expiresOn` (ISO civil
o null), `values` (objeto de campos configurados) y `notes`. La revisión y el autor se
obtienen exclusivamente desde el servidor. PATCH usa `action: UPDATE`, versión esperada
y contenido completo, o `action: CANCEL` y versión esperada sin contenido adicional.

## Integridad, permisos y concurrencia
- `documents:read` para consultar; `documents:present` para mutar. El permiso nuevo se
  asigna al Administrador, nunca al Visualizador. Los servicios también comprueban alcance.
- El alcance de empresa se aplica antes de buscar, contar o paginar. El listado por obligación
  devuelve como máximo 20 resúmenes y no incluye valores, observaciones, autor ni huellas.
- Las fechas se guardan como PostgreSQL DATE y se devuelven sin hora. La revisión asignada
  decide si el vencimiento es obligatorio o no permitido. Emisión no supera vencimiento.
- Los campos se validan con las definiciones originales, incluso después de revisar el catálogo.
- FK compuestas garantizan tipo/obligación/revisión; un trigger exige revisión asignada al
  insertar y protege identidad, numeración, autor y solicitud. Las canceladas son inmutables.
- Cada alta incrementa la versión de obligación y asigna el siguiente número dentro de
  una transacción Serializable. Edición/cancelación requieren versión optimista del borrador.
- El `requestId` por obligación y autor evita duplicar un alta tras una respuesta incierta.
  Un reintento secuencial idéntico devuelve la misma presentación, sin otra auditoría. Reutilizar
  esa clave con otro contenido se rechaza. Una carrera Serializable puede responder conflicto;
  consultar/reintentar la solicitud original, no inventar una clave distinta a ciegas.
- No se puede preparar ni editar con entidad/empresa/tipo inactivos. Se permite consultar y
  cancelar borradores de entidades inactivas. No se borra historia para desbloquear una baja.
- Mutaciones y auditoría son atómicas. Auditoría contiene IDs, acción y versión, no los valores
  personalizados ni observaciones. La huella de idempotencia es interna y no se serializa.

## Frescura y siguientes extensiones
Después del commit el autor navega/refresca el detalle o listado. No hay caché persistente
compartida, polling ni sincronización en vivo entre usuarios; otras sesiones refrescan al
consultar. Los conflictos piden actualizar para no sobrescribir cambios concurrentes.

La futura carga debe reservar adjuntos, fijar cada intento y persistir jobs antes de llamar a
S3. No agregar estado aprobado ni descarga a estos borradores sin validar formato y análisis.
La futura adopción de configuración conservará `revisionId` de cada presentación, conforme
a `document-configuration-adoption.md`. No reinterpretar sus datos con la revisión nueva.
