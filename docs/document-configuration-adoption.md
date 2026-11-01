# Adopción explícita de configuración — decisión para el hito 3

## Estado
Este documento define el contrato pendiente; **no hay todavía una operación de adopción**.
La configuración original sigue fijada por `DocumentRequirement.revisionId` y su trigger
inmutable. No modificar la migración 004 ya aplicada ni levantar esa protección como atajo.

## Decisión
Cambiar el catálogo no cambia automáticamente obligaciones existentes. Adoptar será una
mutación explícita, con previsualización de diferencias, motivo, permiso específico
(`documents:adopt-configuration`) y alcance de la empresa. La primera implementación será
por obligación; las aplicaciones masivas quedan fuera del primer recorrido vertical.

## Persistencia aditiva prevista
En una migración nueva del hito 3:
- Agregar un historial append-only `DocumentRequirementConfiguration`, con obligación,
  tipo/revisión, secuencia, autor, motivo y fecha de adopción.
- Inicializar una entrada por obligación existente, referenciando su revisión original;
  no recrear obligaciones ni cambiar su identidad.
- Incorporar una referencia a configuración activa perteneciente a esa misma obligación,
  garantizada por FK compuesta y, si la inserción circular lo requiere, constraint diferible.
- Cada presentación del hito 2 debe fijar su revisión de tipo desde el servidor. Al integrar
  el historial, conservar esa revisión y vincularla a su configuración correspondiente.
- Mantener `revisionId` original como referencia histórica; las consultas de política actual
  usarán la configuración activa, no sobrescribirán la referencia fundacional.

Los nombres definitivos y constraints se revisarán junto al esquema real de presentaciones
del hito 2, antes de generar la migración. No adelantar una FK a una tabla todavía inexistente.

## Reglas funcionales
1. Autorizar en servicio, validar versión esperada de obligación y de catálogo.
2. Verificar que el tipo esté activo y la nueva revisión siga aplicando al subtipo.
3. Mostrar cambios en obligatoriedad, criticidad, campos, aprobación y avisos antes de confirmar.
4. Insertar la adopción, actualizar referencia activa/versionado y auditar en una transacción.
5. Rechazar cambios concurrentes, adopciones duplicadas y referencias de otro tipo/obligación.

Los campos obligatorios y reglas de aprobación de la revisión nueva rigen para nuevas
presentaciones. No se reinterpretan ni editan valores, aprobación o fechas de certificados
anteriores. La política administrativa actual de obligatoriedad, criticidad y anticipación
puede cambiar con la adopción, pero no convertir en inexistente el vencimiento documentado
de un certificado anterior ni invalidarlo solo porque le falte un campo agregado después.

Si la revisión deja de aplicar al subtipo, no se permite adoptarla para esconder la obligación.
Se deberá usar la operación autorizada de excepción/cierre que se defina en el hito 3,
con historial y tratamiento explícito de alertas. No borrar ni reparentar la obligación.

## Impacto y frescura
Tras commit, refrescar configuración de obligación, formulario de nueva presentación,
listados, métricas, calendario y alertas pendientes del ámbito afectado cuando esos módulos
existan. El worker revalidará antes de enviar. No modificar retrospectivamente mensajes
ya enviados ni evaluaciones históricas.

## Pruebas de aceptación requeridas
- Cambiar catálogo sin adoptar conserva política y documentos anteriores.
- Adoptar conserva la presentación previa y aplica nuevos campos a la próxima.
- Una renovación en revisión no desplaza el certificado aprobado.
- Se mantienen vencimientos reales aunque la configuración futura pase a no exigir fecha.
- Se rechazan usuario fuera de alcance, revisión de otro tipo y doble adopción concurrente.
- El fallo de auditoría revierte toda la adopción; no deja referencia activa huérfana.
