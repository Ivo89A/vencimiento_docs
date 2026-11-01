# Infraestructura de archivos documentales — base del hito 2

## Entradas
- Configuración lazy y sin valores predeterminados de acceso: `src/lib/env.ts`,
  `getDocumentFileEnv`. No se exige S3 al usar autenticación o CRUD.
- `clients.ts`: construye el cliente S3 y el analizador, solo en servidor/CLI.
- `s3-document-store.ts`: cuarentena privada, referencias internas e integridad SHA-256.
- `clamav-scanner.ts`: protocolo `zINSTREAM`, solo TCP privado/loopback.
- `private-network.ts`: valida todas las respuestas DNS y conecta a una IP literal validada.
- CLI: `npm run files:check`; conectividad opt-in: `-- --network`, EICAR adicional: `--eicar`.

Variables y preparación: `../../../.env.example` y `../../../docs/document-storage-setup.md`.
Seguimiento real: `../../../IMPLEMENTATION_PLAN.md`.

## Invariantes
Los adaptadores no autentican usuarios finales: son infraestructura interna. Antes de usarlos
desde una ruta/worker, el servicio documental debe autorizar operación, obligación y empresa.
No importar estos módulos en componentes cliente ni devolver `StoredDocumentObject` en DTOs.
No hay todavía rutas de carga, adjuntos persistidos, aprobación ni visor.

S3 usa el SDK oficial fijado, credenciales explícitas, HTTPS salvo loopback no productivo,
claves aleatorias y `If-None-Match: *`. Nunca solicita ACL pública. Copia los bytes de entrada
antes de esperar y valida tamaño real/hash al leer. ETag/versionId fijan el objeto cuando el
proveedor los soporta; no se interpreta ETag como checksum. No ofrece enlaces firmados ni
borrado/listado general. El único borrado existente pertenece a su propio diagnóstico opt-in.

El analizador envía bytes, no rutas/nombres de archivos. Tiene límite, plazo total, chunks
big-endian, lectura de respuesta hasta EOF y validación estricta. Respuestas desconocidas,
errores, límites o desconexiones son fallo de análisis, nunca resultado limpio. La respuesta
no incluye texto de firmas del proveedor. TCP de clamd no cifra ni autentica: usar red privada
o túnel seguro y mantener firmas/límites del daemon según la guía de preparación.

Un resultado CLEAN solo significa resultado del analizador, **no aprobación documental**:
faltan validación del formato real, persistencia, autorización, revisión y selección efectiva.

## Alcance del diagnóstico
Sin `--network` solo valida configuración y no contacta servicios. La red requiere
`DOCUMENT_FILES_VERIFY_ISOLATED=true` y entorno no productivo. El diagnóstico escribe un
objeto aleatorio en cuarentena, lo relee, compara integridad, hace GET sin firma/credenciales
y sin redirects, y elimina su objeto/versión con confirmación de ausencia.

Esto comprueba ese objeto, no todas las políticas/prefijos del bucket, cifrado en reposo,
backups ni actualización periódica de firmas. No crea buckets ni cambia permisos. Un PUT
con resultado de red incierto puede dejar un objeto sin referencia confirmada; no se borra
una versión desconocida a ciegas. La reconciliación durable se implementará con adjuntos/jobs.

Las pruebas HTTP/TCP locales son fixtures de protocolo, no un S3 desplegado ni un ClamAV real.
No contar su éxito como validación de infraestructura externa o detección real de malware.
