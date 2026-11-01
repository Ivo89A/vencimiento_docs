# Punto de entrada para continuidad

1. Leer `IMPLEMENTATION_PLAN.md`: fuente de progreso, bloqueos y pruebas ejecutadas.
2. Leer `docs/architecture.md` y `prisma/schema.prisma`.
3. Revisar `package.json` y lockfile antes de instalar o cambiar dependencias.
4. Autorización: `src/domains/auth/authorization.ts` y `access-policy.ts`.
5. Mutaciones empresariales: servicios en cada dominio; auditoría transaccional.

El grupo no es un SaaS multiinquilino: contiene múltiples razones sociales con alcances de acceso.
El administrador tiene permisos globales; un visualizador tiene solo permisos de lectura y el
alcance explícitamente asignado. Sin asignación no debe ver registros por defecto.
Las obligaciones legales de ejemplo no constituyen asesoramiento ni un catálogo normativo definitivo.

## Primera entrega existente: no rehacer
- Base Next.js, autenticación y provisión CLI ya implementadas.
- Razones sociales: contratos en `legal-entity.schemas.ts`, operaciones en
  `legal-entity.service.ts`, DTO en `legal-entity.types.ts`, rutas API y páginas reales.
- CSV tiene permiso independiente, filtros compartidos, límite y selección autorizada.
- `scripts/verify-postgres.ts` ejecuta migraciones, integración y E2E usando un cluster real
  aislado y un SMTP local en proceso separado. No contiene contraseñas predefinidas.
- Antes de estaciones, mantener la política Serializable tanto para alta/activación de hijos
  como para baja de la razón social: no abrir una carrera con la validación de dependencias.
- Estaciones ya tiene servicios, API, páginas, CSV e historial. Empezar por
  `src/domains/stations/README.md` y `docs/stations.md`; no reconstruir ese módulo.
- Tiendas y rodados tienen tablas y restricciones; agregar sus servicios y UI,
  no crear tablas duplicadas ni dar sus módulos por completos por existir el esquema.
- Las futuras altas/activaciones/transferencias de tiendas deben validar empresa activa y,
  si hay estación, que esté activa y pertenezca a la misma empresa. Usar Serializable para
  coordinarse con bajas de estación/razón social y registrar auditoría en la misma transacción.
- El estado operativo de estación es independiente de la baja lógica y del cumplimiento documental.
  No convertirlo en un semáforo de vencimientos ni mostrar documentación ficticia.
- Leer `docs/verification.md` para distinguir funcionalidad probada y alcance pendiente.
- Prioridad actual por pedido del usuario: ejecutar los seis hitos documentales registrados en
  `IMPLEMENTATION_PLAN.md` antes de retomar CRUD de tiendas/rodados. No saltar la verificación.
- Motor documental: empezar por `src/domains/documents/README.md`. Registro, tipos/revisiones,
  reglas por subtipo, campos y asignaciones implementados y verificados: 103 unitarias,
  50 de integración y 12 E2E. Ver bloque de evidencia final del hito 1 en el plan.
- No confundir el catálogo de anticipaciones con alertas operativas: archivos, vencimientos,
  excepciones, calendario y worker siguen pendientes de los hitos siguientes.
- Para hito 2 el usuario eligió servicios existentes. S3/antimalware aún sin configurar;
  seguir `docs/document-storage-setup.md`. No instalar Docker ni inventar credenciales.
- Ajustes del catálogo cerrados: contexto de estación conservado, búsqueda de última revisión,
  asignación existente visible y enlace filtrado por ID autorizado. Última suite: 103 unitarias,
  53 de integración, 12 E2E. Las esperas del smoke externo se debían a pérdida del acento en
  scripts PowerShell enviados a stdin de Node; el recorrido local pasó con Unicode seguro.
- Adopción de configuración: decisión en `docs/document-configuration-adoption.md`.
  Es un contrato para hito 3, no una función operativa ni permiso ya provisionado.
- Aclaración más reciente: el usuario todavía no tiene S3 ni antimalware. Antes de validar
  hito 2 hay que seleccionar/provisionar esos servicios; no asumir que existen por su respuesta
  inicial. No contratar cuentas ni instalar Docker sin autorización específica.
- Hito 2 iniciado: adaptadores/CLI en `src/infrastructure/document-files/README.md`.
  Configuración lazy, SDK S3 fijado y ClamAV privado por INSTREAM. `npm run files:check`
  valida configuración; red/EICAR son opt-in no productivos. No hay rutas de carga/visor todavía.
  Pruebas de protocolo son fixtures, no infraestructura real; seguir bloqueos/evidencia del plan.
- Última verificación global de esta base: 184 unitarias, 53 de integración y 12 E2E aprobados;
  instalación limpia, typecheck, lint y build aprobados. Audit productivo: 0 avisos. Hito 2
  sigue parcial: no hay infraestructura externa ni endpoints de carga/presentaciones/visor.

No hay credenciales de demostración en producción. No incluir datos ficticios sin seed opt-in.
