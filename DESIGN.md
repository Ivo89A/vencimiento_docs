# Sistema visual — Gestión documental

## Dirección
Centro de control para un grupo de estaciones de servicio: información precisa,
operaciones claras y trazabilidad. No es una landing comercial ni una demo de cumplimiento.

## Tokens
- Tinta / navegación: `#152c3c`.
- Acción petróleo: `#14685f` (texto blanco).
- Fondo de trabajo: `#f3f6f8`; superficie: `#ffffff`.
- Texto secundario: `#526477`; borde: `#dce4ea`.
- Ámbar reservado para advertencias; rojo para errores y acciones destructivas.
- Tipografía: Manrope variable local, fallback del sistema; números tabulares.
- Espaciado base 4 px; controles de 44 px; paneles 24–32 px; secciones 32 px.
- Radios: controles 8 px, paneles 16 px, indicadores de estado en píldora.

## Composición
Navegación lateral oscura y contenido claro alineado a la izquierda. El inicio combina
un resumen numérico real con accesos por tarea, no gráficos sin datos ni tarjetas idénticas.
Listados: encabezado → filtros → tabla/tarjetas móviles → paginación.
Formularios: grupos semánticos, instrucciones breves, errores asociados, acciones al final.
Detalles: datos generales y vínculos relacionados separados del historial.

```text
Escritorio                        Móvil
┌──────────┬───────────────────┐  ┌────────────────────┐
│ Marca    │ Ruta / contexto   │  │ Menú · contexto    │
│          ├───────────────────┤  ├────────────────────┤
│ Módulos  │ Título + acciones │  │ Título             │
│          │ Filtros           │  │ Acciones + filtros │
│          │ Tabla / contenido │  │ Tarjetas / campos  │
│ Cuenta   │ Paginación        │  │ Paginación         │
└──────────┴───────────────────┘  └────────────────────┘
```

## Decisiones contra plantillas genéricas
Sin curvas decorativas, gradientes de relleno, métricas inventadas o gráficos de ejemplo.
La personalidad reside en la navegación tinta, la tipografía y el registro documental.
UI/UX Pro Max se consultó con dos búsquedas: se descartaron la composición comercial
y las fuentes académicas del primer resultado. Se retuvieron la jerarquía funcional,
la grilla y los estados de interacción de la segunda; paleta adaptada al producto.

## Interacción y accesibilidad
Foco visible; texto además de color; targets táctiles de 44 px; enlaces reales.
Transiciones de color 160 ms y apertura de modal 180 ms, sin animaciones continuas.
`prefers-reduced-motion` desactiva movimiento. Menú móvil modal nativo con Escape,
foco contenido y retorno al disparador. Estados de espera y errores anunciados.

## Alcance
Todas las rutas existentes de autenticación, inicio, empresas, estaciones y documentación.
Administrador y visualizador comparten componentes pero conservan permisos y alcance.
No existen aún pantallas de administración de usuarios/roles ni métricas de vencimientos;
este rediseño no las simula ni modifica APIs, servicios o persistencia.
