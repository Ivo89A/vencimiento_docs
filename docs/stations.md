# Módulo de estaciones

## Funcionalidad
Rutas `/estaciones`, `/estaciones/nueva`, `/estaciones/:id`, `/estaciones/:id/editar`.
API `/api/stations`: GET listado, POST alta; `/api/stations/:id`: GET detalle, PUT edición,
PATCH estado del registro. No existe borrado físico de estaciones desde la aplicación.

Listado con búsqueda por nombre/código/localidad, filtro de razón social, estado operativo
y baja lógica; orden por nombre o código, paginación servidor, selección de filas y CSV.
Detalle con datos generales e historial separado, cargado solo cuando se abre esa sección.
El inicio y el perfil de razón social enlazan a las estaciones autorizadas.
En escritorio se usa tabla; en pantallas menores a 768px se muestran tarjetas con selección
táctil, datos etiquetados y orden por nombre/código. Se monta una sola representación, de modo
que no se exportan selecciones duplicadas de una tabla oculta. Al cambiar de vista se reinicia
la selección local; los filtros y el orden se mantienen en la URL.

## Estados distintos
- Estado del registro: activa/inactiva, controla disponibilidad y baja lógica.
- Estado operativo: operativa, temporalmente fuera de servicio, cerrada.
- Estado documental: **todavía pendiente**, se calculará en el motor unificado. Nunca se
  interpreta "operativa" o "activa" como cumplimiento documental aprobado.

## Reglas del servidor
Permiso `stations:read` para consultas; `stations:write` para mutaciones; `stations:export`
adicional para CSV. El visualizador no recibe escritura ni exportación por defecto.
El permiso no sustituye el alcance: las empresas se obtienen de asignaciones del usuario.

Altas y activaciones exigen una razón social activa. La edición histórica de una estación
inactiva bajo una empresa inactiva se permite, pero no su reactivación. Las mutaciones usan
aislamiento Serializable, compatible con la baja de razones sociales; ante conflictos el
backend devuelve 409 y pide actualizar, sin sobrescribir ni comunicar un éxito inexistente.

Transferir una estación requiere alcance tanto de origen como de destino. No se permite
si tiene tiendas asociadas, incluso inactivas: se evita la cascada implícita de la FK compuesta.
La baja lógica se rechaza si existen tiendas activas. No se borran registros históricos.
El primer hito del motor documental amplía la política: no se permite transferir una
estación con obligaciones asignadas. La restricción está en el servicio y en SQL; no se
mueven obligaciones o evidencia entre empresas silenciosamente.

## Consultas y sincronización
Las lecturas proyectan campos y aplican alcance antes del count/paginación. El selector de
empresas devuelve hasta 20 opciones con búsqueda, siguiente/anterior y señal de más resultados;
no se carga una lista global ni se truncan opciones sin aviso. Las respuestas antiguas se
cancelan al cambiar búsqueda. El selector expone identidad/nombre/estado, no CUIT/contactos.

Sin cache persistente compartida de datos privados. Tras commit, el autor navega a detalle
y refresca la ruta; los listados y contadores vuelven a consultar al navegar. Selecciones
se reinician al cambiar filtros/página. No existe todavía sincronización en tiempo real
entre dispositivos; una sesión abierta sin nuevas consultas no recibe eventos push.

CSV comparte filtros con el listado, permite selección de la página o exportación total del
filtro, hasta 5000 filas con rechazo explícito si se supera el límite. Se validan los IDs
seleccionados contra alcance y filtros; la exportación queda auditada y neutraliza fórmulas.

## Migración y compatibilidad
Aplicar `npm run db:deploy` antes de abrir las nuevas rutas. La tercera migración agrega
estado operativo, unicidad de código por empresa sin distinguir mayúsculas y el permiso
de exportación al rol Administrador existente. El resto de roles no recibe permisos nuevos.
El índice conserva los datos existentes; si hay códigos que colisionan, la migración falla
en transacción y el administrador debe resolverlos explícitamente, no se fusionan ni borran.

Pruebas y resultados vigentes: `IMPLEMENTATION_PLAN.md`. La pestaña Documentación enlaza
al motor común para asignar/consultar requisitos. Aún no hay archivos, visor, semáforo de
cumplimiento ni vencimientos en este módulo.
