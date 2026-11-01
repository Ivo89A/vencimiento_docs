# Estaciones

- Contratos y etiquetas: `station.schemas.ts`; DTOs: `station.types.ts`.
- Lecturas acotadas y selector de empresas: `station.queries.ts`.
- Mutaciones y auditoría: `station.service.ts`; exportación: `station-export.service.ts`.
- Entradas: `/api/stations`, `/estaciones`; no requieren nuevas variables de entorno.

Estado operativo y baja lógica son independientes. Altas, transferencias y activaciones
validan empresa activa y alcance; todas las mutaciones usan Serializable, compatible con
la baja de la razón social. La transferencia se rechaza si hay tiendas (incluso inactivas),
para evitar la cascada implícita de la FK compuesta. El primer hito documental ya rechaza
la transferencia si existen obligaciones, también en SQL; conserva su alcance histórico.

Las lecturas no cachean datos privados entre solicitudes. El autor reconcilia detalle/listado
con navegación y refresh; otras sesiones obtienen datos frescos al volver a consultar/navegar.
No se promete tiempo real. El enlace documental permite asignar/consultar obligaciones;
no hay visor ni evaluación de cumplimiento hasta completar los siguientes hitos del motor.

Contexto y pendientes generales: `../../../docs/HANDOFF.md` y `../../../IMPLEMENTATION_PLAN.md`.
