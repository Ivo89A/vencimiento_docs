# Arquitectura y decisiones

## Aplicación
Next.js App Router, runtime Node, React Server Components para lectura inicial y hojas cliente
para formularios e interacciones. Tailwind y componentes estilo shadcn/ui. TypeScript estricto.
Route Handlers llaman a servicios de dominio; las páginas invocan esos servicios sin HTTP interno.

## Datos y aislamiento
PostgreSQL con Prisma, migraciones versionadas, FK y restricciones SQL. UUID para negocio;
IDs de autenticación gestionados por Better Auth. Roles y permisos son tablas extensibles.
El alcance se obtiene de la sesión y de asignaciones persistidas, nunca del cuerpo de una petición.
Un rol define operaciones; las asignaciones definen recursos. Negación por defecto.

Razones sociales contienen estaciones, tiendas y rodados. Tienda y estación deben compartir
razón social: FK compuesta además de validación del servicio. Baja lógica no elimina historial.
Desactivar una razón social con dependencias activas se rechaza; no se hace cascada silenciosa.

## Motor documental (catálogo y borradores implementados; archivos y ciclo efectivo pendientes)
Registro `DocumentableEntity`, discriminado por tipo, con una FK concreta hacia su subtipo.
El CHECK exige exactamente una referencia y un subtipo coincidente; las FK compuestas garantizan
razón social para estaciones/tiendas/rodados. Un trigger registra altas de las cuatro entidades,
el backfill incorpora las existentes y un trigger diferible evita borrar el registro documental
sin borrar la entidad concreta. No se usa un campo `(type, id)` sin FK.
Las transferencias actualizan el alcance solamente sin obligaciones: el trigger rechaza la
cascada si hay requisitos históricos. La baja lógica conserva el registro y las obligaciones.
`DocumentTypeRevision` es append-only en SQL y fija campos/reglas al asignar explícitamente una
obligación. La configuración común exige permiso y alcance global; una revisión nueva no
reescribe requisitos asignados. Reglas v1: subtipos elegibles, obligatoriedad, criticidad,
aprobación, vencimiento, umbral, anticipaciones y campos tipados. Sin generación masiva implícita.
Adopción explícita futura: contrato en `document-configuration-adoption.md`. Requerirá historial
aditivo de configuraciones por obligación y autorización propia; no se levantará la inmutabilidad
de la revisión original ni se reinterpretarán certificados anteriores.

Los siguientes modelos y comportamientos siguen siendo diseño objetivo:
`DocumentType` define configuración; `DocumentRequirement` es obligación de una entidad;
`DocumentVersion` conserva cada presentación y sus decisiones de aprobación;
`Attachment` apunta al objeto privado. La versión seleccionada debe pertenecer a su obligación.

Implementado como primer paso aditivo: `DocumentPresentation` conserva metadatos en borrador,
con número por obligación, revisión fijada y fechas DATE. Edición con control de versión y
cancelación irreversible sin borrar contenido; un borrador no es `DocumentVersion` aprobado
ni evidencia. Contrato, API y límites en `document-presentations.md`. La migración 005 protege
identidad, revisión asignada, transiciones y conservación en SQL.

Al renovar, crear nueva versión en transacción con control optimista o bloqueo de obligación.
No mutar fechas de una versión aprobada silenciosamente. Una versión en revisión no aporta
cumplimiento ni reemplaza automáticamente una aprobada. Excepciones no aplicables tienen
motivo, autorizador, fecha y auditoría. Campos dinámicos: definiciones versionadas, validación
servidora y valores JSON estructurados; campo archivo con FK a adjunto, nunca base64.

## Vencimientos
Fechas sin hora en PostgreSQL DATE. Instantes de auditoría UTC (timestamptz).
Comparar con fecha civil de la zona configurada; vencimiento hoy sigue vigente durante hoy.
Un servicio puro calcula estado; cron genera alertas, no determina la verdad del estado.
Los agregados SQL y filtros deben compartir esas reglas. No cachear estados más allá del cambio de día.
Mostrar por separado faltantes, revisiones y vencidos aunque el semáforo tenga una sola prioridad.

## Archivos y efectos externos
S3 privado, claves aleatorias, límites de cuerpo en proxy y aplicación. Carga a cuarentena,
validación de firma y decodificación, análisis antimalware sin permitir acceso hasta resultado limpio.
No confiar en extensión/MIME. El análisis fallido deja el archivo bloqueado, nunca aprobado.
Previsualización protegida con soporte Range para PDF; descarga requiere permiso adicional.
URLs firmadas solo si se acepta su condición de enlace portador por un TTL breve; para separación
estricta visualizar/descargar usar endpoints protegidos. PDFs con contenido activo deben aislarse.
Objetos huérfanos se reconcilian con tareas recuperables; S3 no participa en transacciones SQL.

Outbox transaccional, worker con leases y reintentos limitados. Unicidad de alertas por obligación,
ciclo/versión, umbral y destinatario. Correos al menos una vez con clave de idempotencia del proveedor
cuando exista; no prometer exactamente una entrega SMTP ante caída después del envío.
Links a registros requieren login. No registrar cuerpos de recuperación ni tokens en auditoría.

## Seguridad y explotación
Better Auth con Prisma y transacciones, scrypt, registro público deshabilitado, sesiones revocables.
Origen/CSRF comprobado en mutaciones propias; protección incorporada en endpoints de autenticación.
Rate limits persistidos de autenticación. Sin cookie cache de permisos para revocación inmediata.
Errores públicos consistentes, auditoría con campos permitidos, secretos únicamente en entorno.
Middleware/proxy es filtro de navegación, no reemplaza autorización servidor por recurso.

## Pruebas y cierre
Unitarias puras y de validación; integración contra PostgreSQL aislado para constraints, rollback y
concurrencia; Playwright para flujos completos y rechazo real de escritura por visualizador.
Typecheck, lint y build no equivalen a aceptación funcional. Cada fase informa limitaciones.
