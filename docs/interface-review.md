# Revisión de interfaz

## Alcance
Login, recuperación, restablecimiento (válido/inválido), inicio, listados/altas/detalles/
ediciones de empresas y estaciones, historial, obligaciones y configuración documental.
Los permisos de administrador y visualizador se conservan; no se crearon nuevas rutas
de negocio ni se cambiaron servicios, APIs, migraciones o consultas.

## Revisión de código
- Tokens y jerarquía documentados en `DESIGN.md`.
- Tipografía variable local y licencia incluidas; sin CDN ni fuentes descargadas en build.
- Foco global visible, controles con etiquetas, iconos nuevos decorativos ocultos,
  errores de login asociados con `aria-describedby`, visibilidad de contraseña accesible.
- Menú móvil mediante `showModal()`: fondo inerte, Escape y cierre explícito; se cierra
  al navegar y al cambiar a escritorio. Sin librería adicional ni trampa de foco manual.
- Una sola representación seleccionable por listado; sin checkboxes ocultos duplicados
  que contaminen la descarga CSV al cambiar de viewport.
- Tablas de escritorio con ancho mínimo legible y región desplazable por teclado;
  tarjetas táctiles en móvil. Se corrigió la compresión de acciones a una letra por línea
  observada en la primera captura de 768 px.
- Confirmaciones nativas conservan validación, versionado, errores y cancelación segura.
- Estados vacíos, carga, error, permiso, éxito y espera comparten convenciones.
- Animaciones de apertura sin loops; `prefers-reduced-motion` desactiva movimiento.

Contrastes calculados con luminancia sRGB WCAG (pares de tokens, no auditoría completa):

| Texto / fondo | Relación |
| --- | --- |
| Blanco / petróleo `#14685f` | 6,61:1 |
| Secundario `#526477` / blanco | 6,09:1 |
| Secundario lateral `#b3c3ce` / tinta `#152c3c` | 7,97:1 |
| Texto activo `#123f38` / selección `#c4e8dc` | 8,88:1 |
| Estado activo `#246148` / `#eef8f2` | 6,72:1 |

## Pruebas reproducibles
`npm run verify:postgres` ejecuta las pruebas existentes de integración y E2E con bases
aisladas, más `tests/e2e/ui.visual.spec.ts`. El test de interfaz recorre las rutas reales,
genera capturas en `test-results/`, comprueba desborde horizontal, visibilidad de contraseña,
Escape/foco de confirmación y menú, y tamaños 375, 768, 1024 y 1440 con movimiento reducido.
Las capturas son evidencia para revisión humana, no snapshots visuales aprobados por sí solos.

## Límites
No equivale a certificación WCAG, prueba manual con lector de pantalla, Safari/iOS real,
ensayo en dispositivos físicos, medición de rendimiento ni matriz exhaustiva de contenido.
No se agregó guard de navegación para cambios sin guardar; se conservan los flujos de
cancelación y guardado existentes. Las tablas pueden desplazarse dentro de su región en
anchos intermedios; no se ocultan columnas ni se desborda horizontalmente toda la página.
Error general y loading cuentan con revisión de código; no se rompe la base de datos para
forzar su captura. No se simulan archivos, alertas ni cumplimiento documental pendiente.

## Resultado
Primera comprobación: typecheck, lint, 184 unitarias y build aprobados.
Primera regresión: 53 pruebas de integración y 14 E2E aprobados. La inspección visual
detectó capturas anticipadas del skeleton y una advertencia de hidratación causada por
el ocultamiento de caret de Playwright antes de hidratar. Se corrigió el test para esperar
el contenido, conservar el caret y comprobar avisos de hidratación sin suprimirlos en React.
Se repite la regresión con los ajustes finales; consultar el cierre en `IMPLEMENTATION_PLAN.md`.
