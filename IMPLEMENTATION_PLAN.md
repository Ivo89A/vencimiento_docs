# Seguimiento de implementación

## Objetivo y reglas
Sistema empresarial real de gestión documental para estaciones de servicio argentinas.
No sustituir persistencia por mocks, no publicar archivos privados ni completar módulos solo visualmente.
Cada entrega requiere autorización del servidor, validación, tratamiento de errores y pruebas.

## Estado actual
- [x] Inspeccionar carpeta: inicialmente vacía, sin Git ni dependencias.
- [x] Copiar las seis skills solicitadas: 106 archivos verificados por SHA-256. Origen sin modificaciones.
- [x] Consultar versiones npm y documentación oficial de Better Auth.
- [x] Definir arquitectura inicial y supuestos (docs/architecture.md).
- [x] Fase 3: base funcional inicial verificada en PostgreSQL, SMTP y navegador real.
- [ ] Fase 4: módulos de negocio completos y verificados.
- [ ] Fase 5: administración completa.
- [ ] Fase 6: portal por permisos y carga móvil.
- [ ] Fase 7: aceptación integral y preparación de producción.

## Fase 3 — Base funcional
- [x] Next.js, TypeScript estricto, Tailwind, componentes y configuración.
- [x] Esquema PostgreSQL / Prisma y dos migraciones SQL aplicadas a bases aisladas reales.
- [x] Login, logout, recuperación SMTP y sesiones persistidas, verificados en navegador real.
- [x] Permisos extensibles y alcance por razón social; por entidad individual pendiente.
- [x] Alta inicial por CLI sin contraseñas predeterminadas, entrada oculta y hash scrypt.
- [x] Layout responsive, formularios, errores y auditoría transaccional inicial.
- [x] Typecheck, lint, build y pruebas de seguridad base; se repiten tras cambios posteriores.

## Fase 4 — Negocio (orden obligatorio)
Cada módulo se cierra con CRUD conectado, permisos y pruebas de integración.
- [x] Razones sociales: alta, listado, detalle, edición, activación / baja lógica e historial inicial.
- [x] Razones sociales: API de CSV filtrado y selección, fórmula neutralizada y autorización independiente.
- [x] Selección y descarga CSV verificadas en navegador de escritorio y móvil emulado.
- [ ] Completar perfil documental y pestañas de entidades relacionadas cuando existan sus dominios.
- [x] Estaciones: CRUD, API, estado operativo separado, transferencias controladas, selector paginado, CSV, historial y enlaces; verificación PostgreSQL/E2E aprobada.
- [ ] Tiendas: independientes o asociadas a estaciones de la misma razón social.
- [ ] Rodados: patente normalizada, datos y gestión de estado.
- [x] Tipos documentales y reglas de aplicación por subtipo configurables, revisiones inmutables verificadas.
- [ ] Obligaciones y excepciones autorizadas.
- [ ] Carga S3 privada, cuarentena, antimalware, visor y descarga autorizada.
- [ ] Versiones, aprobación opcional y concurrencia.
- [ ] Vencimientos: cálculo centralizado, fechas locales, prioridades configurables.
- [ ] Calendario con rango acotado y filtros.

## Fase 5 — Administración
- [ ] Dashboard: métricas y gráficos reales, cumplimiento con denominador definido.
- [ ] Reportes PDF, Excel, CSV: filtros compartidos, exportaciones acotadas.
- [ ] Alertas, outbox, worker, deduplicación y reintentos.
- [ ] Emails y resúmenes diarios / semanales.
- [ ] Administración visual de usuarios, roles, permisos y alcance (base de autorización ya implementada).
- [ ] Consulta global de auditoría y configuración persistida (historial de razón social ya implementado).
- [ ] Campos personalizados versionados y validación por rol.

## Fases 6–7
- [ ] Portal de visualizador y operador, navegación sin herramientas no autorizadas.
- [ ] Carga desde cámara, previsualización, accesibilidad y responsive.
- [ ] Tests unitarios, integración PostgreSQL y E2E Playwright de todos los dominios y del escenario integral.
- [ ] Concurrencia, rollback, acceso cruzado, CSRF y archivos maliciosos.
- [ ] Escenario de aceptación completo del prompt original.
- [ ] Seeds exclusivamente opt-in de desarrollo, documentación y despliegue.
- [ ] Copias de seguridad y restauración comprobada, observabilidad y límites.

## Dependencias y limitaciones detectadas
- Node 22.19.0, npm 10.9.3 y Git disponibles; Docker y pnpm ausentes del PATH.
- No se detectó servicio PostgreSQL de Windows. No se dispone aún de DATABASE_URL proporcionada por el usuario.
- Producción requiere PostgreSQL, S3 privado, SMTP, antimalware y scheduler/worker.
- Una prueba que requiera servicios ausentes debe figurar como pendiente, nunca aprobada.
- MUI está instalada como skill, no como biblioteca de interfaz: se mantiene shadcn/Tailwind.

## Decisiones (motor, worker y outbox son arquitectura objetivo, aún no implementada)
- Monolito modular con worker independiente y servicios compartidos.
- Better Auth con sesiones en BD, registro público deshabilitado y recuperación segura.
- Prisma CLI y Client 7.10.1 alineados: `latest` de CLI devolvía una RC y se descartó.
- Entidades documentables con FK y correspondencia de subtipo garantizada en SQL.
- Vencimiento como DATE; timestamps de eventos en UTC; zona inicial Buenos Aires.
- Versiones históricas preservadas; una propuesta en revisión no invalida el certificado aprobado vigente.
- Mutaciones con auditoría en la misma transacción; servicios externos mediante outbox.

## Pruebas y evidencia
- Copia de skills: 6 carpetas / 106 archivos idénticos por SHA-256.
- `db:validate`: esquema Prisma válido.
- `typecheck`: aprobado después de corregir una API de Vitest 5 y el tipo de variables de entorno.
- `lint`: aprobado sin advertencias.
- `build`: aprobado; sin secretos ni conexión a BD durante compilación.
- Unitarias finales: 59 aprobadas (CUIT, validación, límites, permisos, alcance, HTTP/origen, CSV, fechas y entorno seguro).
- `npm audit --omit=dev`: 0 vulnerabilidades reportadas.
- Auditoría completa tras modernizar linter: 12 avisos moderados transitivos; sin `audit fix --force` ni overrides mayores inseguros. Dependencias productivas: 0 avisos.
- Integración sin URL: falló correctamente con mensaje de seguridad; no se contó como aprobada.
- Se preparó un harness PostgreSQL real temporal, sin servicio Windows ni cambios a `.env`.
- Primer arranque del harness: PostgreSQL 18.6 inició, pero pg_ctl conservó pipes en Windows y el runner agotó tiempo. Se detuvo explícitamente ese cluster y se corrigió stdio.
- Integración PostgreSQL real: dos migraciones aplicadas y 11 pruebas aprobadas, incluidos rollback, concurrencia y FK compuesta.
- E2E: detectó generación de ID de Better Auth incompatible con esquema. Se corrigió con generador UUID explícito.
- E2E móvil: se corrigió la prueba para abrir el menú antes de cerrar sesión y se ocultó correctamente la navegación cerrada para accesibilidad.
- Última ejecución completa: 8 E2E aprobados, sin omisiones, en Chromium y Pixel 7 emulado, incluida descarga CSV seleccionada.
- Se verificó SMTP real local, contraseña anterior rechazada, sesión revocada, token no reutilizable y HTTP 429 por rate limit.
- Lint, typecheck y 59 unitarias repetidos después de instalación limpia: aprobados.
- Build posterior a instalación limpia: aprobado, sin secretos ni conexión a BD.
- `npm ci`: aprobado, 429 paquetes instalados sin force ni legacy-peer-deps.
- La primera comprobación de `npm ci` detectó un lockfile inconsistente de peers opcionales de
  @hookform/resolvers 7 con npm 10. Se fijó 5.2.2 estable, compatible con RHF 7/Zod 4, sin force;
  instalación limpia, typecheck, lint, unitarias y build aprobados. Repetición final con esta resolución: 11 de integración y 8 E2E aprobados, sin omisiones.
- Linter: se descartó ESLint 9 por EOL y el agregado legacy por peers incompatibles. Configuración explícita ESLint 10 + plugins oficiales, sin forzar resolución.

## Próximo paso
Por pedido posterior del usuario, priorizar el motor documental y vencimientos antes de
retomar tiendas y rodados. No se marcan sus módulos CRUD como completados.
Configurar PostgreSQL y SMTP permanentes antes de usar la aplicación con datos del cliente.
El cluster temporal de QA se detiene; no equivale a una instalación productiva ni a datos demo persistentes.

## Segunda entrega — estaciones (verificada)
- Se conserva el esquema y autenticación existentes; no se agregaron dependencias.
- Nueva migración: estado operativo independiente, código único por empresa sin distinguir mayúsculas,
  y permiso stations:export con actualización del rol Administrador existente.
- El nuevo índice falla ante colisiones previas; no elimina ni fusiona registros del cliente.
- Alta, edición, transferencia y activación con Serializable; auditoría en la misma transacción.
- No se transfiere una estación con tiendas, ni se desactiva con tiendas activas.
- Selector de empresas paginado, búsqueda acotada, cancelación de respuestas antiguas y reintento.
- Se comparten componentes de CSV y confirmación de baja con razones sociales.
- Unitarias actuales: 86 aprobadas; lint, typecheck, validación Prisma y build aprobados.
- Primera verificación: build y 3 migraciones aprobados; 28 pruebas de integración aprobadas
  (17 nuevas de estaciones), 9 E2E aprobados y 1 móvil fallido por selección en tabla ancha.
- Se reemplazó la tabla móvil por tarjetas táctiles, sin duplicar controles ocultos. No se
  forzaron clics ni se omitió la prueba.
- Verificación final: 3 migraciones aplicadas a ambas bases aisladas PostgreSQL 18.6;
  29 pruebas de integración aprobadas (18 de estaciones + 11 de razones sociales).
- Se observó el driver real al consultar 10 y 100 filas: la prueba de consultas acotadas pasó.
- E2E finales: 10 aprobados, sin omisiones, en escritorio y Pixel 7 emulado. Incluyen CRUD,
  historial, CSV seleccionado, permisos, acceso cruzado, CSRF y regresión de autenticación/SMTP.
- `npm audit --omit=dev`: 0 vulnerabilidades reportadas. Sin dependencias nuevas ni cambios de lockfile.
- PostgreSQL y SMTP temporales detenidos al finalizar. No se configuró infraestructura productiva.

### Siguiente hito — tiendas
- Reutilizar patrones de selector, exportación, confirmaciones y validación existentes.
- Alta, detalle, edición, baja lógica, búsquedas, filtros y CSV con permisos y alcance.
- Tienda independiente o asociada a estación de la misma empresa, conservando la FK compuesta.
- Alta/activación exige empresa activa y, si tiene estación, estación activa.
- Transferencias y asociaciones explícitas con alcance sobre origen/destino y auditoría.
- Usar Serializable compatible con bajas de estación y razón social; probar concurrencia real.
- Verificar integración y E2E móvil/escritorio antes de pasar a rodados.

## Entrega documental — orden acordado con el usuario
1. Modelo, permisos, tipos/reglas configurables y obligaciones en una estación existente.
2. S3 privado, cuarentena, validación/antimalware, presentaciones y versiones; visor protegido.
3. Aprobación, excepciones, selección efectiva, estados y semáforos con fechas civiles.
4. Vencimientos centralizados y calendario acotado.
5. Alertas persistidas, worker, reintentos, deduplicación y revalidación de destinatarios.
6. Reportes y aceptación completa del certificado de bomberos, administrador/visualizador.

### Hito 1 — implementado y verificado
- Migración 004: registro documentable de los cuatro subtipos con FK real y alcance compuesto,
  CHECK de correspondencia y trigger diferible para impedir registros concretos sin registro documental.
- Backfill sin recrear entidades; triggers registran nuevas altas incluso de escritores externos.
- Catálogo, revisiones inmutables y configuración fija por obligación. Tipos inactivos no borran historia.
- Reglas de aplicación por subtipo; asignación explícita, no generación masiva o retroactiva silenciosa.
- Campos configurables de texto, número, fecha y booleano; definiciones versionadas y validador estricto.
- Permisos separados de lectura/configuración/asignación; configuración común exige alcance global.
- API y pantallas conectadas en `/documentacion` y `/documentacion/tipos`; enlace desde estación.
- Asignación Serializable, unicidad entidad/tipo, revisión esperada y auditoría transaccional.
- Transferencias con obligaciones rechazadas en servicio y SQL, para estaciones, tiendas y rodados.
- UI indica pendientes y ausencia de evaluación; no informa un falso cumplimiento.
- Verificación final: 103 unitarias, 50 de integración y 12 E2E aprobados, sin omisiones.
- Typecheck, lint, validación Prisma y build aprobados. Audit productivo: 0 avisos reportados.
- Cuatro migraciones aplicadas en ambas bases aisladas. Prueba adicional de migración sobre
  los cuatro subtipos existentes preserva IDs, contenido y versiones empresariales.
- SQL observado en lecturas paginadas de obligaciones: consultas acotadas, sin consultar por fila.
- E2E documental: configuración con campo personalizado, asignación, nueva revisión sin
  reescritura histórica y visualizador sin escritura, en escritorio y móvil emulado.
- Se corrigió una espera de navegación de la prueba y se aisló la limpieza de fixtures de
  rate limit en la base E2E; se mantiene habilitado el límite real y su prueba HTTP 429.
- Migración 004 aplicada también a la vista local: se conservan 3 empresas y 4 estaciones,
  con 7 registros documentables. No se agregaron requisitos ficticios ni dependencias npm.
- Vista local restaurada en http://localhost:3000; login administrador y catálogo documental
  responden correctamente. Dos smoke tests iniciales agotaron la espera de encabezado durante
  navegación; la comprobación directa posterior obtuvo HTTP 200, título y control de alta.

### Dependencias de los hitos siguientes
- No hay S3 privado ni antimalware configurados actualmente. No se reemplazarán por archivos públicos.
- Hito 2 no se considerará probado sin infraestructura real de prueba aislada y análisis de archivos.
- Avisos configurados en el catálogo aún no envían notificaciones: worker pendiente del hito 5.
- La vista local se pausa durante QA para no mezclar la base de ejemplo con las bases aisladas.
- El usuario eligió **servicios existentes**, no instalación local de Docker. El siguiente
  paso es configurar acceso a S3 privado y antimalware del usuario según
  `docs/document-storage-setup.md`, sin compartir secretos en chat ni tocar buckets productivos.
- Hitos 2–6 todavía pendientes: esta entrega no completa todo el plan documental/vencimientos.

## Cierre de ajustes del hito 1 — verificado
Orden pedido tras la revisión: cerrar estos ajustes antes de avanzar a archivos privados.
- [x] Crear/revisar tipos conserva `entityId` autorizado en navegación, cancelación y guardado.
- [x] Catálogo busca por código o nombre de última revisión, no por nombres históricos ocultos.
- [x] Búsqueda parametrizada y escapado literal de `%`, `_` y `\`, con el mismo filtro en count.
- [x] Asignaciones existentes se consultan en lote de hasta 20 tipos, con permiso/alcance;
  se muestra "Ya asignado" con enlace a la obligación en lugar del botón duplicado.
- [x] Filtro directo de obligación intersectado con alcance y entidad, con regreso al listado.
- [x] Definido contrato de adopción explícita, sin cambiar aún datos históricos:
  `docs/document-configuration-adoption.md`. La operación se implementará en el hito 3.
- [x] Regresión de navegación: E2E ampliado sin saltos manuales; tres vueltas adicionales
  mediante enlaces entre catálogo/obligaciones, en escritorio y móvil. Sin respuestas 5xx.
- [x] Verificación final: 103 unitarias, 53 de integración PostgreSQL y 12 E2E aprobados,
  sin omisiones; typecheck, lint y build aprobados.
- Diagnóstico local confirmado: PowerShell → stdin de Node reemplazaba el acento del literal
  "Documentación", por lo que los selectores del smoke externo buscaban otro texto. Se
  comprobó que el literal recibido no coincidía con su equivalente Unicode. El recorrido
  Inicio → Documentación → Tipos → Obligaciones pasó usando selectores Unicode seguros.
  No se aumentaron timeouts, no se forzaron clics ni se cambió la aplicación para ocultarlo.
- Vista local restaurada en http://localhost:3000, sin crear nuevos datos empresariales.
- No se modificaron migraciones aplicadas ni se agregaron dependencias.
- S3 privado y antimalware siguen sin configurar; no se habilitan archivos sin análisis.
- Aclaración posterior del usuario: **todavía no tiene proveedor S3 ni servicio antimalware**.
  La preferencia anterior por "servicios existentes" no implica que ya estén disponibles.
  Hito 2 requiere primero seleccionar/provisionar un bucket privado aislado y un analizador
  accesible por red segura. No se autorizó contratar servicios ni instalar Docker.
  Contratos/adaptadores pueden desarrollarse antes, pero las cargas no se habilitarán ni se
  contarán como verificadas hasta disponer de infraestructura real y pruebas de seguridad.

## Hito 2 — base de infraestructura implementada; pruebas externas bloqueadas
- [x] Configuración documental independiente/lazy en `src/lib/env.ts`: no rompe CRUD sin S3.
- [x] Adaptador S3 oficial `@aws-sdk/client-s3` 3.1161.0, estable consultado en npm y fijado,
  compatible con Node del proyecto; lockfile actualizado e instalación `npm ci` aprobada.
- [x] Escritura en cuarentena con UUID, sin ACL pública, sin sobrescritura y caché privada;
  lectura acotada con ETag/versión y SHA-256, copia de entrada y cancelación de cuerpos detenidos.
- [x] Cliente ClamAV INSTREAM con límite/plazo, respuestas estrictas, rechazo de TCP público,
  validación de todas las IPs DNS y conexión a una IP validada, sin segunda resolución.
- [x] `npm run files:check`: configuración sin red; `--network` exige confirmación de entorno
  aislado no productivo; EICAR requiere además `--eicar`. No crea ni modifica buckets/políticas.
- [x] Diagnóstico S3 con objeto propio: integridad, GET anónimo sin credenciales/redirects,
  limpieza de versión exacta y confirmación de ausencia; fallos de limpieza no se ocultan.
- [x] Errores saneados: sin claves S3, credenciales, URLs del proveedor ni contenido binario.
- [x] 184 unitarias aprobadas, incluyendo fixtures HTTP con SDK real, TCP de protocolo y DNS.
  Las fixtures no son proveedores reales ni prueban detección antimalware real.
- [x] Typecheck, lint y build aprobados. `npm audit --omit=dev`: 0 vulnerabilidades.
  Auditoría completa: permanecen 12 avisos moderados de herramientas/transitivos de desarrollo.
- [x] Regresión final: 53 pruebas de integración PostgreSQL y 12 E2E aprobados, sin omisiones;
  las cuatro migraciones existentes se aplicaron a ambas bases aisladas. Sin migraciones nuevas
  ni cambios de UI. Las 184 unitarias incluyen la comprobación del comando INSTREAM exacto.
- [x] CLI comprobado con configuración de fixture: la red se bloquea en producción o sin
  confirmación de infraestructura aislada antes de crear clientes; no hubo conexiones externas.
- [ ] Pruebas reales S3/ClamAV/EICAR bloqueadas: el usuario aún no dispone de esos servicios.
  `npm run files:check` falla correctamente por configuración ausente, sin contactar servicios.
- [ ] Pendientes del hito: persistencia de adjuntos y envío de presentaciones, carga autorizada, validación
  real de PDF/imágenes, jobs/reconciliación, renovaciones y visor. No hay endpoint de carga activo.
- No se instalaron servicios, no se contrataron cuentas y no se crearon archivos públicos.
- Localhost restaurado y verificado por navegador: autenticación y navegación documental
  funcionan sin S3. Se conservan 3 empresas, 4 estaciones y 7 registros documentables.

## Rediseño visual — entrega en verificación
- [x] Inspección de rutas y componentes existentes; se conservan APIs, servicios y permisos.
- [x] Skills de diseño descargadas al proyecto; procedencia y alias polish documentados en
  `docs/interface-skills.md`. Sistema visual y decisiones en `DESIGN.md`.
- [x] Tokens, Manrope local con licencia, navegación tinta, contexto de ruta y menú móvil
  modal nativo con Escape, foco contenido y retorno al disparador.
- [x] Inicio con conteos reales autorizados, accesos por tarea y alcance del usuario.
- [x] Formularios, tablas y tarjetas móviles de empresas/estaciones, filtros, confirmaciones,
  documentación y catálogo, estados vacíos, carga, error y permisos con base visual común.
- [x] Login/recuperación/nueva contraseña adaptados; mostrar/ocultar contraseña en login.
- [x] Microinteracciones discretas y movimiento reducido. Sin gráficos ficticios ni módulos
  nuevos que simulen administración de usuarios, archivos o vencimientos.
- [x] Primera comprobación: typecheck, lint, 184 unitarias y build aprobados.
- [ ] Regresión PostgreSQL/E2E y capturas responsive en ejecución sobre bases aisladas.
- [ ] Revisión visual final y restauración de la vista local.

## Continuación documental — presentaciones en borrador (2026-11-04)
- [x] Inspección de estado, esquema y contratos existentes; no se rehízo el catálogo ni la interfaz.
- [x] Migración 005 aditiva: presentaciones con revisión fijada, número por obligación, fechas
  DATE, campos tipados, autor, idempotencia y control de versión. FK y triggers protegen historia.
- [x] Servicios y API para crear, consultar, editar y cancelar borradores con permiso propio
  `documents:present`, alcance, validación y auditoría transaccional. No permite aprobar/enviar.
- [x] Pantallas conectadas desde las obligaciones; formulario por configuración asignada y
  consulta sin escritura para visualizadores. Cancelación confirmada e historial conservado.
- [x] No se informa cumplimiento: cada presentación se identifica como borrador sin archivo.
  No hay cargas, descargas ni llamadas S3/ClamAV nuevas; infraestructura externa aún pendiente.
- [x] Primera verificación: typecheck, lint y 195 unitarias aprobados.
- [x] Verificación ampliada: build, typecheck, lint, 196 unitarias y 66 de integración aprobados;
  las cinco migraciones se aplicaron a ambas bases QA. Audit productivo: 0 avisos.
- [x] Migración 005 aplicada en la base local existente conservando IDs/versiones y 3 empresas,
  4 estaciones y 7 registros. Cluster previo recuperado con respaldo físico, sin reinicializar
  ni sustituir registros; diagnóstico de carpetas faltantes documentado en `docs/verification.md`.
- [x] Verificación final: 196 unitarias, 66 de integración PostgreSQL y 14 E2E aprobados,
  sin omisiones. Typecheck, lint, validación Prisma y build aprobados. Capturas de borrador,
  cancelada y confirmación inspeccionadas en escritorio/móvil; foco y permisos comprobados.
- [x] Capturas E2E ajustadas a `caret: initial`: la ocultación del cursor de Playwright
  alteraba atributos antes de hidratar. Repetición final sin avisos de hidratación y con
  aserción explícita; no se suprimieron advertencias en el producto.
- [x] Vista local restaurada y verificada: login, navegación documental estable y API con
  alcance. Usa `next dev --webpack` para evitar un bucle de recarga observado con Turbopack
  en esta vista local; la suite QA con Turbopack sí pasó. No se cambió el script del proyecto
  ni se afirma resuelta la causa del bucle. Sin nuevas obligaciones ni presentaciones demo.
- Sigue pendiente completar el hito 2 (adjuntos, formato real, análisis/jobs/reconciliación,
  envío, renovaciones definitivas y visor) antes de aprobación/vencimientos/alertas/reportes.
