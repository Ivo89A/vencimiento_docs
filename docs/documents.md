# Documentación: catálogo y obligaciones

## Uso de la primera entrega
1. Abrir **Documentación → Tipos documentales → Nuevo tipo documental** como administrador.
2. Configurar código, nombre, categoría, subtipos elegibles y prioridad.
3. Definir obligatoriedad, aprobación, vencimiento, umbral y anticipaciones futuras.
4. Agregar campos personalizados con clave estable y tipo (texto, número, fecha, sí/no).
5. En el detalle de una estación, abrir **Documentación → Asignar requisito**.
6. Buscar el tipo, asignarlo y comprobar que aparece como **Pendiente de carga**.

Crear o revisar un tipo desde una entidad conserva esa entidad al volver al catálogo y al
cancelar. El catálogo muestra "Ya asignado" y un enlace a la obligación existente; el enlace
usa un ID validado y vuelve a comprobar alcance, incluso si la obligación está fuera de la
primera página del listado. La búsqueda del catálogo usa el nombre de la revisión más reciente
y el código estable, no nombres de revisiones históricas que no se muestran.

El catálogo no es un asesoramiento legal ni incorpora obligaciones normativas automáticas.
No hay datos ficticios preinstalados. Un certificado de bomberos puede configurarse como
primer recorrido, pero su exigencia real debe determinarla el administrador responsable.

## Reglas
- Tipos comunes a todo el grupo: solo se configuran con permiso y alcance global.
- El visualizador consulta las obligaciones de las empresas que tiene asignadas.
- Asignar requiere permiso específico y entidad, empresa y tipo activos.
- Una obligación por entidad/tipo, con revisión fijada al asignar.
- Cambiar el catálogo crea una revisión inmutable, sin cambiar requisitos ya asignados.
- El contrato de adopción explícita está definido en `document-configuration-adoption.md`;
  la operación y su historial se implementarán en el hito 3, no están habilitados todavía.
- Desactivar un tipo impide nuevas asignaciones; conserva requisitos y configuración anterior.
- Desactivar una entidad conserva obligaciones. No se permite trasladarlas a otra empresa
  mediante una transferencia de estación, tienda o rodado.
- No existe eliminación de tipos/revisiones/obligaciones desde la API ni la interfaz.

La definición de campos y los valores futuros tienen validación estricta en servidor. Las
revisiones JSON no requieren cambiar el esquema SQL para agregar campos. No se aceptan
archivos ni datos base64 como campos personalizados. Los adjuntos serán relaciones privadas
del siguiente hito, no una URL libre ingresada por el usuario.

## Contratos y datos
GET/POST `/api/document-types`; PUT `/api/document-types/:id` para nueva revisión y PATCH
para activación. GET/POST `/api/document-requirements`. La API valida origen en mutaciones.
`typeVersion` evita asignar inadvertidamente una configuración que cambió desde su lectura.
Listados de 20 filas, orden estable, búsquedas acotadas y filtros de alcance antes del count.
Los perfiles documentales solo consultan su entidad; no cargan documentos globales ocultos.
El listado de obligaciones omite definiciones de campos y configuraciones históricas profundas.

La migración 004 registra las entidades existentes sin tocar IDs ni datos empresariales.
Las nuevas altas crean su registro documental en SQL, incluso si no pasan por los servicios.
La FK concreta, el CHECK de subtipo y las claves compuestas por empresa evitan referencias
huérfanas y alcance incorrecto. El trigger diferible impide quitar un registro mientras su
entidad siga existiendo. Obligaciones referenciadas bloquean borrados físicos por FK RESTRICT.

## Frescura
No hay caché persistente compartida de datos privados. Tras confirmar la transacción, el
autor navega y refresca la vista pertinente. Otras sesiones ven cambios al navegar o consultar,
no reciben eventos push. La búsqueda y paginación se conservan en la URL.

## Límites de esta entrega
Todavía no incluye carga/visor, renovación/aprobación, excepciones, calendario, semáforos,
reportes o envío de alertas. Las anticipaciones son configuración para el worker futuro,
no notificaciones operativas. Sin evidencia no hay evaluación favorable de cumplimiento.
El orden de los seis hitos y la evidencia ejecutada están en `IMPLEMENTATION_PLAN.md`.
