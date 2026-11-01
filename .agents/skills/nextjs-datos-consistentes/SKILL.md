---
name: nextjs-datos-consistentes
description: "Implementar y revisar funcionalidades Next.js con consultas eficientes, carga de datos mínima, integridad referencial y sincronización de base de datos, cachés y pantallas. Aplicar al crear o modificar lecturas, listados, calendarios, dashboards, Server Components, Server Actions, Route Handlers, servicios de datos y operaciones CRUD; especialmente DELETE, cancelaciones, reprogramaciones, relaciones entre entidades, referencias inexistentes, N+1 y datos desactualizados. Adaptar al ORM, motor y versión existentes; no imponer Prisma ni una base de datos específica."
---

# Next.js: datos rápidos y consistentes

Versión autónoma: este archivo reúne la skill y sus cuatro guías. No requiere archivos complementarios.

Implementar cada funcionalidad como un circuito completo: leer solamente lo necesario, preservar las reglas de negocio al escribir y reflejar el resultado confirmado en todos los consumidores afectados. Priorizar corrección y aislamiento de datos; optimizar con evidencia.

### Adaptación CIMA AI (este repositorio)

- Stack de datos: **Drizzle** en `src/db/schema`, migraciones en `drizzle/`, PostgreSQL.
- Tenancy de negocio: **subcuenta** (`session.activeSubaccountId`); guards en
  `src/lib/access-guards.ts`. Producto y deudas: `docs/HANDOFF.md`.
- Mutaciones de dominio: Server Actions → `src/lib/*-lifecycle.ts` (permiso,
  transacción, auditoría). Jobs: inbox/outbox + pg-boss en la misma transacción
  cuando aplique (`recordInboxEvent` / `recordOutboxEffect`).
- WAH (`src/lib/tenant.ts`): scope **organization**, no subcuenta (deuda documentada).
- Reglas de agente: `.cursor/rules/nextjs-datos-consistentes.mdc` y esta sección en `AGENTS.md`.

## 1. Reconocer el proyecto

Antes de editar, inspeccionar `AGENTS.md`, `package.json`, lockfile, configuración de Next.js, esquema y migraciones, cliente de BD, servicios de dominio, autenticación y librería de estado remoto.

- Identificar App Router o Pages Router, versión real instalada, runtime, ORM, motor, estrategia multiempresa y cachés existentes. Confirmar si Cache Components está habilitado.
- Localizar las lecturas y escrituras de la entidad, sus relaciones entrantes y salientes, trabajos pendientes, vistas derivadas y pantallas consumidoras. Usar `rg`; no asumir que el nombre de una tabla aparece igual en todos los módulos.
- Reutilizar la arquitectura existente. Mantener consultas y reglas reutilizables en una capa de servidor compartida; evitar duplicarlas entre API, acciones, agentes y tareas programadas.
- Verificar las APIs en documentación oficial de la versión instalada cuando haya dudas. No actualizar Next.js ni cambiar de ORM para cumplir esta skill.
- Si no hay acceso al proyecto, entregar reglas o una propuesta identificada como tal. No afirmar que se implementó, midió o probó el sistema.

## 2. Definir el contrato de datos

Para cada pantalla o endpoint, determinar antes de programar:

1. Qué campos se muestran o necesitan para permisos, identidad y lógica; cuáles se cargarán al abrir el detalle.
2. Qué filtros, orden, intervalo temporal y límite debe resolver la BD.
3. Qué nivel de frescura requiere la experiencia: inmediato para el autor, eventual con plazo explícito o sincronización entre usuarios.
4. Qué consultas y vistas se ven afectadas por altas, cambios, cancelaciones y bajas.

Expresar este contrato en código y, para cambios complejos, en una breve tabla de impacto. No generar documentación extensa para cambios triviales.

## 3. Consultar con un costo acotado

Leer [Anexo A: Consultas eficientes](#anexo-a-consultas-eficientes) al implementar o revisar lecturas.

- Proyectar columnas mediante `select` o equivalente. Evitar `SELECT *`, entidades completas y relaciones profundas cuando no son necesarias.
- Filtrar, ordenar, agregar y paginar en la BD. Acotar también las colecciones anidadas. Aplicar permisos y subcuenta antes de paginar o contar.
- Usar límites validados en servidor, orden estable y desempate único. Cargar calendarios por la ventana visible; pedir detalles al abrirlos y opciones de selectores mediante búsquedas acotadas.
- Resolver N+1 mediante joins adecuados, cargas por lotes o capacidades verificadas del ORM. No confundir `Promise.all` dentro de un `map` con resolver N+1.
- Paralelizar únicamente consultas independientes y con concurrencia acotada. Evitar joins que multipliquen filas y cargas duplicadas entre servidor y cliente.
- Elegir índices según filtros, joins y orden reales. Verificar el SQL generado y su plan cuando exista un problema de rendimiento; no agregar índices indiscriminadamente.
- Reutilizar conexiones según el runtime y el driver. No crear un pool por solicitud ni desconectar el cliente compartido después de cada consulta.
- No cargar datos de pestañas cerradas ni de todos los módulos por anticipado sin una necesidad medida.

## 4. Mantener integridad en toda mutación

Leer [Anexo B: Mutaciones e integridad](#anexo-b-mutaciones-e-integridad) antes de modificar relaciones, borrados, cancelaciones o reprogramaciones.

- Autenticar, validar entrada y autorizar sobre la entidad y su subcuenta en servidor. No confiar en un `tenantId` ni en IDs relacionados enviados por el navegador.
- Centralizar la operación de negocio para que UI, API, bots y procesos usen las mismas invariantes.
- Mantener atómicos los cambios relacionados dentro de la misma BD. Usar constraints y control de concurrencia para impedir estados imposibles.
- Definir explícitamente el tratamiento de cada dependencia: eliminar hijos propios, eliminar vínculos, desvincular relaciones opcionales, impedir la baja o conservar historia mediante el modelo existente.
- Distinguir borrar, cancelar y archivar. No aplicar cascada a todas las relaciones; no borrar entidades compartidas ni evidencia histórica por arrastre.
- Revisar claves foráneas efectivas, su dirección y migraciones. No suponer que un campo de ORM garantiza integridad en la BD.
- Capturar dentro de la operación los identificadores de recursos, fechas y agregados afectados, incluidos valores anteriores y nuevos cuando cambien.
- Confirmar la transacción antes de invalidar cachés o comunicar éxito. Separar los fallos de persistencia de los fallos posteriores de sincronización.

## 5. Sincronizar todos los consumidores afectados

Leer [Anexo C: Cache y sincronizacion](#anexo-c-cache-y-sincronizacion) para elegir las APIs compatibles y el alcance de actualización.

- Tratar como capas distintas: BD, datos derivados, caché de servidor, caché de cliente, estado local y otras sesiones.
- Diseñar claves/tags por entidad y subcuenta; incluir filtros, orden y permisos relevantes en las claves. Asegurar que los tags invalidables estén asignados realmente en las lecturas.
- Tras el commit, actualizar o invalidar detalle, listados, calendarios, contadores, selectores, disponibilidad y otras vistas que dependan del cambio. No invalidar toda la aplicación por comodidad.
- En el cliente, retirar o actualizar el registro, limpiar selecciones y cerrar o resolver detalles abiertos que ya no existen. Refrescar colecciones filtradas aunque el registro no estuviera en la página visible si pueden cambiar sus totales o pertenencia.
- Si se usa actualización optimista, protegerse de respuestas antiguas y revertir solamente cuando la escritura no se confirmó. Reconciliar con el servidor después de una respuesta incierta.
- No asumir que `router.refresh()`, una cascada SQL o invalidar un tag actualiza por sí solo todas las capas.
- Para otras pestañas o usuarios, usar el mecanismo existente de eventos, suscripción o reconsulta. Si se requiere tiempo real y no existe, explicar el alcance y proponer el mecanismo mínimo; no prometer actualización instantánea sin implementarlo.

## 6. Verificar el comportamiento observable

Leer [Anexo D: Verificacion y reglas del proyecto](#anexo-d-verificacion-y-reglas-del-proyecto) al cerrar una implementación y al incorporar esta política a un proyecto.

- Verificar el recorrido real, incluyendo consumidores secundarios, navegación posterior y fallos pertinentes. Para integridad y concurrencia, preferir pruebas contra una BD de prueba con el mismo motor.
- Comprobar que el número de consultas no crezca una por cada fila, que los límites se cumplan y que no se serialicen campos innecesarios.
- Para una baja, comprobar ausencia de referencias activas inválidas y conservación de entidades compartidas. Para cambios de fecha o recurso, verificar disponibilidad anterior y nueva.
- Probar autorización entre subcuentas cuando corresponda. No inventar mediciones ni afirmar que está todo sincronizado si solamente se comprobó la pantalla principal.
- Ejecutar las verificaciones existentes relevantes. Ampliarlas solamente para un riesgo concreto; no crear una batería nueva para un cambio visual trivial.

Al entregar, resumir qué datos se consultan, qué dependencias cambian, cómo se actualizan sus consumidores y qué se verificó. Declarar las limitaciones reales. Una skill guía a los agentes que la cargan; para establecer una regla común del proyecto, usar la incorporación a `AGENTS.md` descrita en la referencia de verificación.

---

## Anexo A: Consultas eficientes

### Diseñar lecturas pequeñas

Separar listado, detalle y agregados. Para una agenda mostrar, por ejemplo, `id`, inicio, fin, estado, recurso y nombre breve del cliente; cargar notas, documentos e historial al abrir el detalle. Elegir campos según el caso real, no copiar este contrato sin revisar la UI.

Para un calendario que muestra `[desde, hasta)`, consultar los turnos que se solapan con esa ventana: `inicio < hasta AND fin > desde`. No limitarse a turnos cuyo inicio cae dentro del rango. Aplicar taller, subcuenta y estados que ocupan capacidad. Resolver la zona horaria del taller al construir límites; almacenar y comparar instantes de manera consistente. Separar bloqueos manuales de ocupaciones asociadas a turnos.

Acotar el tamaño máximo de la ventana y la cantidad devuelta. Si existe truncamiento, indicarlo y ofrecer paginación o carga por segmentos; no ocultar turnos silenciosamente.

Parametrizar valores en SQL y en consultas raw. Resolver nombres de columnas, operadores y orden mediante listas permitidas del servidor; no interpolar entrada del usuario. Limitar también longitudes de búsqueda y tamaños de lotes.

Obtener totales mediante agregaciones; para una pregunta de existencia, usar `EXISTS`, `findFirst` con proyección mínima o equivalente. No descargar filas para contarlas en JavaScript. Pedir `COUNT` exacto solamente si la interfaz lo necesita; `limit + 1` suele bastar para saber si hay una página siguiente.

### Paginar sin huecos artificiales

Usar cursor/keyset para colecciones grandes o recorridos continuos; permitir offset acotado si se requieren saltos de página y su costo es aceptable. Mantener un orden total, por ejemplo `(inicio, id)`. Envolver y validar en el servidor el cursor; no usarlo como autorización.

Ejemplo conceptual de PostgreSQL, con parámetros enlazados:

```sql
SELECT id, inicio, fin, estado
FROM turno
WHERE subcuenta_id = $1
  AND inicio >= $2 AND inicio < $3
  AND (inicio, id) > ($4, $5)
ORDER BY inicio ASC, id ASC
LIMIT $6;
```

Usar este ejemplo para un listado por fecha de inicio, no para la detección de solapamientos del calendario. Omitir la condición del cursor en la primera página. Limitar `$6` en servidor. Verificar tipos, semántica de nulos, orden y capacidades del motor/ORM antes de traducirlo.

Si cambia el filtro o el orden, reiniciar el cursor. Si el campo de orden puede cambiar durante la navegación, documentar la consistencia esperada y considerar una instantánea o límite temporal cuando se requiera una exportación estable. Para exportaciones, procesar por lotes o streaming, sin cargar toda la tabla en memoria.

### Controlar relaciones y N+1

Inspeccionar el SQL real: `include` o una relación anidada puede generar varias consultas según el ORM y su configuración. Buscar un número acotado de consultas y un volumen razonable, no imponer una única consulta gigantesca.

Preferir un join para relaciones pequeñas o una consulta por lotes con los IDs autorizados de la página. Al combinar varias relaciones de uno a muchos, evitar la multiplicación cartesiana. Acotar los `IN` y las operaciones masivas por lotes razonables. Cargar varias consultas independientes en paralelo solo si el pool puede sostenerlo.

### Índices y evidencia

Proponer índices a partir de consultas frecuentes y cardinalidad: por ejemplo, evaluar `(subcuenta_id, inicio, id)` para el listado anterior. Confirmar que aporte con los filtros reales; no asegurar que ese índice resuelve la búsqueda de solapamientos o cualquier orden alternativo.

Registrar número de consultas, tiempo de BD, filas leídas/devueltas y tamaño de respuesta cuando se optimiza una ruta lenta. Comparar condiciones equivalentes y distinguir caché fría/caliente. Usar `EXPLAIN`; ejecutar `EXPLAIN ANALYZE` únicamente sobre operaciones y entornos apropiados, porque ejecuta la consulta. Un escaneo secuencial puede ser correcto en una tabla pequeña o una consulta poco selectiva.

Preservar predicados aprovechables por índices cuando sea posible. Evaluar búsquedas full-text o índices específicos para texto; no asumir que un B-tree acelera cualquier `contains`. Considerar costo de escritura y mantenimiento antes de agregar índices.

### Evitar trabajo duplicado en Next.js

En App Router, preferir lecturas iniciales desde servidor a través de la capa de datos; no llamar por HTTP a una API propia desde un Server Component cuando se puede invocar el mismo servicio de forma directa. Mantener esa API cuando tenga consumidores externos o una separación arquitectónica real.

Usar componentes cliente para interacciones necesarias. Enviar DTOs mínimos y serializables; nunca credenciales o campos sensibles. Reutilizar la librería de consultas existente; evitar duplicar el fetch inicial al hidratar sin una razón de frescura.

Cargar paneles secundarios con límites de Suspense adecuados y datos diferidos cuando aporte a la experiencia. No usar streaming para esconder una consulta sin límites. Usar debounce y cancelación o descarte de respuestas antiguas para búsquedas interactivas.

### Fuentes de consulta

- [Next.js: obtención de datos](https://nextjs.org/docs/app/getting-started/fetching-data).
- [Prisma: optimización y N+1](https://www.prisma.io/docs/orm/prisma-client/queries/advanced/query-optimization-performance). Consultar la sección de la versión instalada si se usa Prisma.
- [PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html). Usar la documentación equivalente para otro motor.

---

## Anexo B: Mutaciones e integridad

### Decidir por relación

Rastrear las dependencias reales antes de implementar un DELETE. Usar la siguiente tabla como criterio de diseño, no como permiso para cambiar reglas de negocio existentes.

| Dependencia | Tratamiento a evaluar |
| --- | --- |
| Hijo propiedad exclusiva del registro, sin valor independiente | Cascada explícita o borrado transaccional |
| Tabla intermedia de una relación muchos a muchos | Eliminar el vínculo; conservar la otra entidad |
| Relación opcional hacia el registro que se borra | `SET NULL` compatible con esquema y UI |
| Dependencia que impide una baja válida | `RESTRICT` o regla equivalente y error de dominio |
| Historia que debe permanecer | Conservar la entidad archivada/cancelada o un snapshot histórico explícito según el modelo |
| Caché, índice de búsqueda, archivo o tarea externa | Limpieza o actualización recuperable posterior al commit |

Confirmar la dirección: al borrar un turno se pueden borrar sus hijos propios; no borrar automáticamente cliente, vehículo, servicio o bahía. Distinguir referencias vivas que deben resolver de identificadores históricos guardados como evidencia; estos últimos no deben convertirse en enlaces activos rotos.

Usar claves foráneas reales cuando el motor lo permita. Comprobar el SQL de la migración: la configuración del ORM puede emular relaciones sin constraints de BD. En ese caso, identificar escritores que eludan el ORM y diseñar la garantía correspondiente. Al introducir constraints, inspeccionar y resolver inconsistencias existentes conforme a la regla de negocio; no eliminar datos arbitrariamente para que la migración pase.

Para relaciones multiempresa, verificar que la entidad relacionada pertenezca a la misma subcuenta. Evaluar claves foráneas compuestas cuando expresen esa invariante. Al usar `SET NULL` compuesto, comprobar que no intente poner en nulo una columna obligatoria como `subcuenta_id`.

### Transacción y concurrencia

Implementar esta secuencia usando las capacidades reales del motor y la arquitectura existente:

1. Validar formato de entrada y obtener identidad y alcance autorizados en servidor.
2. Dentro de una transacción, localizar el registro autorizado con proyección mínima, verificar su estado y capturar los valores necesarios para limpiar dependencias e invalidar consumidores.
3. Proteger las invariantes concurrentes mediante constraints, actualización condicional/versionado, bloqueo o aislamiento apropiado. Una consulta previa de existencia no basta; una transacción por sí sola tampoco elimina todas las carreras.
4. Aplicar la operación y sus cambios locales relacionados; registrar auditoría mínima si el producto la requiere. Para efectos externos obligatorios, persistir su intención en la misma transacción mediante outbox o una solución durable existente.
5. Confirmar la transacción y devolver un resultado mínimo con los IDs y ámbitos afectados.
6. Invalidar cachés y reconciliar la UI. Procesar efectos externos con reintentos e idempotencia. No mantener locks mientras se llama a servicios de red.

Resolver conflictos e inexistencia con semántica consistente. Una baja repetida debe tener el resultado idempotente definido por la API, sin revelar la existencia de datos de otra subcuenta. No devolver éxito si falló la escritura. Si la escritura se confirmó pero falló la invalidación, no fingir un rollback ni reinsertar el registro en la UI: registrar el fallo, reconciliar y recuperar la sincronización.

Para una reprogramación, actualizar turno y ocupación de forma atómica y proteger la nueva disponibilidad frente a reservas concurrentes. Capturar recurso/fecha anteriores y nuevos. No permitir que una solicitud cree una ocupación huérfana durante la baja.

### Aplicar al ejemplo del turno

Antes de usar esta matriz, confirmar si el producto llama “eliminar” a una baja física o a una cancelación que conserva historial.

| Elemento afectado | Resultado esperado, según el modelo existente |
| --- | --- |
| Turno | Eliminar físicamente o cambiar a estado cancelado/archivado |
| Ocupación asociada | Eliminarla o hacer que deje de consumir capacidad |
| Bloqueo manual independiente | Conservarlo |
| Asignaciones/tablas intermedias | Eliminar o cerrar los vínculos pertinentes |
| Cliente, vehículo, bahía y catálogo de servicios | Conservarlos |
| Facturación e historial | Aplicar regla de conservación; impedir la baja si corresponde |
| Recordatorios pendientes | Cancelarlos; hacer que el worker revalide existencia/estado antes de enviar |
| Calendario, listado, detalle y selectores | Retirar el turno o mostrar el nuevo estado coherentemente |
| Disponibilidad y contadores | Recalcular o invalidar el ámbito afectado |

No prometer la retirada de un mensaje externo ya enviado. Usar idempotencia, cancelación de trabajos y comprobación de estado para limitar efectos pendientes, y describir cualquier carrera residual relevante.

### Borrado lógico

No tratar `deletedAt` como solución automática. Aplicar su filtro centralizado a listados, búsquedas, disponibilidad, agregados y relaciones activas. Revisar unicidad, restauración y referencias a registros archivados. Mantener accesos históricos explícitos y autorizados. Una clave foránea garantiza existencia física; no garantiza que el destino esté activo.

No asumir que `ON DELETE CASCADE` se ejecuta al actualizar `deletedAt` o cambiar el estado a cancelado. Implementar explícitamente los efectos de esa transición.

### Fuentes de consulta

- [PostgreSQL: claves foráneas y acciones referenciales](https://www.postgresql.org/docs/current/ddl-constraints.html).
- [Prisma: modelado relacional](https://www.prisma.io/docs/orm/data-modeling/relational-databases), si este es el ORM del proyecto.
- [Prisma: transacciones](https://www.prisma.io/docs/orm/prisma-client/queries/transactions), verificando versión y aislamiento admitido.

---

## Anexo C: Cache y sincronizacion

### Elegir según la versión instalada

Consultar documentación oficial compatible con el proyecto. Las siguientes distinciones describen APIs verificadas el 22 de septiembre de 2026; no asumir que están disponibles en versiones anteriores.

| Mecanismo | Alcance y decisión |
| --- | --- |
| `React.cache` | Deduplicar lecturas del servidor dentro del contexto de render/solicitud; no usar como caché persistente entre solicitudes |
| `use cache`, `cacheTag`, `cacheLife` | Aplicar solo con soporte y configuración comprobados; definir claves, duración e invalidación |
| `unstable_cache` | Mantenerlo en proyectos que usen ese modelo; no migrar solo por esta skill |
| `updateTag(tag)` | En Server Actions compatibles, expirar datos etiquetados para que la lectura siguiente obtenga datos frescos |
| `revalidateTag(tag, 'max')` | Admitir datos anteriores mientras se revalidan; elegirlo únicamente si esa frescura es aceptable |
| `revalidateTag(tag, { expire: 0 })` | En versiones compatibles, expirar inmediatamente desde Route Handlers cuando no se puede usar `updateTag` |
| `revalidatePath(path)` | Invalidar la ruta indicada; en Route Handlers se aplica al volver a visitarla. No sustituir la invalidación de datos compartidos |
| `router.refresh()` | Volver a solicitar/renderizar la ruta actual; no invalidar con esto la caché de servidor ni asumir que limpia estado local |

No llamar `updateTag` desde un Route Handler. No copiar APIs de App Router a Pages Router. En versiones que la deprecian, evitar la firma antigua de `revalidateTag`; no suprimir errores de tipos para forzar compatibilidad. Para versiones anteriores, consultar su contrato y aplicar el mecanismo soportado.

Asignar tags a las lecturas antes de invalidarlos. No confundir tag con clave: un tag agrupa entradas, pero no aísla sus resultados. Derivar subcuenta y permisos de un contexto autorizado; incorporarlos en claves o particionar la caché según la visibilidad. No guardar resultados privados en una caché global por `id` solamente.

### Diseñar el alcance de invalidación

Para un turno `T` en subcuenta `S`, elegir nombres coherentes con el proyecto, por ejemplo:

- Detalle: `subcuenta:S:turno:T`.
- Colecciones: `subcuenta:S:turnos` o particiones por taller/intervalo si el volumen lo justifica.
- Disponibilidad: `subcuenta:S:disponibilidad:taller:X` con granularidad de fecha cuando sea segura.
- Agregados: tags de los dashboards que efectivamente consuman esos datos.

Invalidar también resultados vacíos: una creación puede convertir una consulta vacía en una lista con elementos. Para cambios que mueven registros entre filtros, fechas o recursos, cubrir las particiones anteriores y nuevas. Si la granularidad fina no se puede determinar de forma correcta, ampliar al dominio dentro de esa subcuenta, evitando un barrido global.

En lecturas de disponibilidad crítica, usar datos suficientemente frescos y volver a comprobar capacidad atómicamente al reservar. Una caché nunca sustituye esa validación. Evitar ocultar un problema de invalidación deshabilitando todas las cachés o añadiendo polling agresivo.

### Resolver estado cliente y respuestas tardías

Usar la librería existente: TanStack Query, SWR u otra. Implementar su mecanismo de invalidación/actualización conforme a la versión instalada; no instalar otra para duplicar estado remoto.

Después de una mutación confirmada:

1. Actualizar o retirar el detalle y limpiar `selectedId`, selecciones múltiples y modales afectados. Deshabilitar formularios que apunten a entidades inexistentes.
2. Actualizar o invalidar listas, páginas infinitas, calendarios y totales de ese ámbito. No limitarse a la clave de la página visible.
3. Corregir la página si se eliminó su último elemento; conservar filtros válidos y resolver detalles por URL con “no encontrado” o navegación apropiada.
4. Evitar que un fetch anterior restaure datos eliminados: cancelar o descartar respuestas antiguas, versionar cuando corresponda y reconsultar tras el commit.
5. Ante una respuesta perdida o ambigua, consultar el estado autoritativo antes de revertir o reintentar una operación no idempotente.

Al invalidar colecciones, evitar refetch simultáneo de todas las páginas históricas sin necesidad. Marcar inactivas como obsoletas y refrescar las activas según la librería. Tratar la ausencia del detalle eliminado como un estado terminal esperado.

### Otras sesiones y sistemas derivados

No equiparar invalidación de servidor con envío de eventos a clientes abiertos. Para sincronización entre operadores, reutilizar el mecanismo existente: SSE, WebSocket, suscripción o reconsulta acotada al foco/intervalo según requisitos. `BroadcastChannel` puede coordinar pestañas del mismo origen, pero no otros usuarios o dispositivos.

Emitir eventos solo después del commit, con ámbito autorizado, identidad del recurso y versión o ID de evento cuando se requiera deduplicación. Reconciliar al reconectar; no depender de que todos los eventos se reciban una sola vez. No incluir datos sensibles innecesarios.

Si existen varios procesos/instancias, comprobar cómo se comparte o invalida su caché. Para buscadores, colas y proyecciones externas, utilizar el mecanismo durable existente cuando se exige recuperación ante fallos. No introducir infraestructura distribuida por un CRUD local simple.

### Fuentes oficiales

- [Next.js: updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag).
- [Next.js: revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag).
- [Next.js: revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).
- [Next.js: useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router).
- [Next.js: obtención y deduplicación de datos](https://nextjs.org/docs/app/getting-started/fetching-data).

---

## Anexo D: Verificacion y reglas del proyecto

### Elegir pruebas que detecten errores reales

Usar las herramientas del proyecto. Seleccionar los escenarios afectados por el cambio; no ejecutar esta lista entera para una modificación menor. Verificar constraints y rollback con una BD de prueba, porque un mock del ORM no reproduce esas garantías.

| Escenario | Evidencia esperada |
| --- | --- |
| Lista de 10 y de 100 filas | Consultas acotadas, proyección mínima y paginación correcta; sin crecimiento N+1 |
| Agenda con un turno que empieza antes del rango visible | Incluirlo si se solapa con el rango |
| Baja con hijos propios y entidad compartida | Limpiar los primeros y conservar la segunda |
| Dependencia histórica que impide borrar | Rechazar o archivar según reglas, sin cambios parciales |
| Cancelación/borrado lógico | Liberar capacidad y aplicar filtros activos, preservando historia |
| Baja desde listado con detalle abierto | Resolver listado, modal, selección, contadores y acceso posterior por URL |
| Creación tras un resultado vacío cacheado | Mostrar el nuevo registro en los consumidores afectados |
| Cambio de fecha/recurso/estado | Actualizar filtros, capacidad y agregados de los valores anteriores y nuevos |
| Fallo a mitad de una mutación | Rollback de cambios locales; no comunicar éxito ni emitir evento de éxito |
| Commit correcto con fallo de invalidación | Conservar la escritura y recuperar la sincronización sin simular rollback |
| Respuesta de lectura anterior al DELETE llega tarde | No resucitar el registro eliminado |
| Dos bajas o dos reservas concurrentes | Resultado idempotente/conflicto definido; sin doble ocupación ni huérfanos |
| ID de otra subcuenta | No acceder ni modificar datos ajenos; tampoco mediante relaciones o caché |
| Segunda sesión y reconexión | Cumplir la frescura acordada y recuperar cambios perdidos |

Medir rendimiento en condiciones representativas solo cuando sea pertinente. No declarar una mejora porcentual sin datos comparables. Si no se puede ejecutar el sistema, indicar qué se revisó estáticamente y qué queda sin verificar.

### Incorporar una exigencia común para los agentes

Cuando el usuario pida establecer esta política en un repositorio al que se tiene acceso, inspeccionar las instrucciones existentes e incorporar una referencia en su `AGENTS.md` vigente, preservando las reglas ajenas. Usar la ubicación real de una copia de la skill accesible a ese proyecto y a sus desarrolladores; no escribir una ruta personal inaccesible ni inventar que otros agentes ya la tienen instalada.

Adaptar este bloque una vez elegida y creada la ubicación real de los archivos:

```markdown
## Consultas y consistencia de datos en Next.js

Antes de crear, modificar o revisar código que lea o escriba datos, cargar
la skill `nextjs-datos-consistentes` desde la ubicación documentada en este
repositorio y aplicar sus referencias pertinentes.

Exigir consultas acotadas y con campos mínimos, autorización en servidor,
integridad de relaciones y actualización de los consumidores afectados.
En cada mutación, resolver BD, cachés y estado de UI. No completar un DELETE
eliminando solamente la fila o retirándola de una sola pantalla.

Para entidades compartidas e históricas, decidir explícitamente entre
eliminar dependencias propias, desvincular, restringir o archivar.
Verificar los escenarios de integridad y frescura afectados y declarar
cualquier parte que no se pudo comprobar.
```

Reemplazar “ubicación documentada” por un enlace relativo que exista antes de dar el trabajo por terminado. Adaptar también al archivo de reglas que lean otras herramientas si el usuario lo solicita. No prometer cumplimiento automático universal: los agentes deben cargar las instrucciones; constraints y pruebas de CI proporcionan controles ejecutables adicionales.

### Entrega breve de una implementación

Informar el cambio funcional, el alcance de datos, la política de relaciones y sincronización aplicada, las verificaciones realizadas y las limitaciones concretas. Incluir métricas solo si se midieron. No afirmar que una revalidación local equivale a tiempo real entre todos los usuarios.
