# Pruebas

## Sin infraestructura
`npm test`: validadores CUIT, límites y campos permitidos, permisos y alcance, entrada HTTP.
`npm run typecheck`, `npm run lint`, `npm run db:validate`, `npm run build`.

## Integración PostgreSQL
Crear una base exclusiva, por ejemplo `gestion_documentos_test`. No compartirla con desarrollo
o producción. Configurar `TEST_DATABASE_URL` y migrarla antes de ejecutar:
```powershell
$original = $env:DATABASE_URL
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm.cmd run db:deploy
$env:DATABASE_URL = $original
npm.cmd run test:integration
```
Si las variables están solo en `.env`, exportá `TEST_DATABASE_URL` a la sesión antes del comando.
El runner falla si falta la URL, si el nombre no contiene `test` o si coincide con DATABASE_URL.
Las pruebas crean usuarios temporales y borran únicamente sus propios registros al finalizar.
Verifican constraint CUIT, auditoría, alcance, rechazo de escritura, concurrencia optimista
y conservación de historial. No simulan el ORM.

Estaciones añade casos de código único normalizado por empresa, alcance de origen y destino,
transferencias sin cascada sobre tiendas, baja con dependencias, empresas inactivas y carrera
entre alta de estación y baja de empresa. También observa el driver real al listar 10 y 100
filas para comprobar consultas acotadas; el observador no reemplaza SQL ni resultados.

## E2E
```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```
Sin fixtures cubre acceso público, validación del login, redirección protegida, recuperación
y ancho móvil/escritorio. El escenario autenticado se omite explícitamente si no se aportan
fixtures aisladas; no se cuenta una omisión como aprobación funcional.

## Verificación autónoma con PostgreSQL temporal
Si disponés de los binarios confiables de PostgreSQL (sin instalar un servicio), configurá:
```powershell
$env:POSTGRES_BIN = "C:\ruta\postgresql\bin"
npm.cmd run verify:postgres
```
El script inicializa un cluster de **PostgreSQL real**, ligado a 127.0.0.1 en un puerto libre,
genera credenciales aleatorias que no imprime, aplica migraciones y ejecuta integración.
Después crea otra BD y usuarios efímeros para Playwright, ejecuta altas/edición/baja,
exportación CSV y rechazos reales de permisos, CSRF y alcance. Levanta un SMTP de captura
en otro proceso, solo en localhost, para probar recuperación real por email, token de un uso,
revocación de sesiones y rate limiting. No se reemplaza el transporte por un mock.
Los contadores del rate limit se limpian antes y después del escenario de recuperación
exclusivamente en la BD local `gestion_e2e_test`; la política de producción no se deshabilita.
Detiene el SMTP y el cluster en `finally`.
No modifica `.env`, no registra servicios de Windows ni toca bases existentes. Conserva
artefactos del cluster detenido en el temporal `opencode` para diagnóstico; contienen solo fixtures.

En esta sesión se usa un paquete de binarios en el temporal externo, no una dependencia
de la aplicación: `@embedded-postgres/windows-x64@18.6.0-beta.19`. La etiqueta beta corresponde
al empaquetado; la versión real del servidor se comprueba mediante `SHOW server_version`.
No se adoptó ese empaquetado como infraestructura productiva. En producción se requiere
PostgreSQL administrado o una instalación estable mantenida por el operador.

Esto aún no equivale al flujo documental completo del prompt: esos E2E se agregarán al
completar el motor y almacenamiento, con base y archivos aislados.
El escenario de estaciones prueba selector de empresas, alta, edición, historial, archivo
lógico/reactivación, enlaces desde razón social, filtros, selección CSV y rechazo de escritura,
exportación y acceso cruzado para visualizador. En móvil exige tarjetas y ausencia de desborde
horizontal de la página, no se fuerzan clics sobre controles inaccesibles.

## Documentación — primer hito
- `document.test.ts`: configuración, reglas/campos tipados y rechazo de permisos sin consultar BD.
- `document.integration.test.ts`: FK/subtipos, revisión fijada, duplicados y concurrencia,
  transferencia protegida, rollback, desactivación y alcance antes de contar.
- `document-migration.integration.test.ts`: aplica las migraciones en un esquema único dentro
  de la base aislada y comprueba backfill de los cuatro subtipos sin cambiar IDs/datos/versiones.
  Solo elimina el esquema de prueba que acaba de crear; no usa datos de la vista local.
- `document.acceptance.spec.ts`: crea configuración/campo en navegador, asigna a una estación,
  crea revisión y comprueba conservación de la anterior; visualizador consulta pero no escribe.
- Regresión ampliada: crear y revisar conserva el contexto de estación sin `page.goto`
  intermedios; catálogo reconoce la asignación y enlaza a su obligación. Búsqueda por nombre
  vigente y tres recorridos adicionales mediante enlaces entre catálogo y obligaciones.
  Se registra cualquier respuesta HTTP 5xx del recorrido sin cuerpos ni credenciales.
- Integración adicional: nombre de última revisión, código estable, comodines como texto literal,
  parámetros SQL hostiles y asignaciones existentes con alcance/filtro directo por obligación.

Los escenarios empresariales limpian únicamente fixtures de rate limit en la base
`gestion_e2e_test` de localhost antes de comenzar. Así los logins de otros escenarios no
consumen su cuota. La protección real permanece habilitada y la prueba de recuperación
sigue comprobando HTTP 429. La suite usa un solo worker, sin limpieza concurrente.

## Infraestructura documental — adaptadores sin servicios desplegados
- `document-file-config.test.ts`: configuración independiente de auth/BD, HTTPS, límites,
  booleanos estrictos, ausencia de valores secretos en errores y direcciones privadas.
- `document-private-dns.test.ts`: DNS privado/mixto, literal fijada y plazo agotado; resolver
  controlado de prueba, sin consultas DNS externas. No se toma la primera IP ignorando el resto.
- `clamav-scanner.test.ts`: servidor TCP de fixture en loopback comprueba framing INSTREAM,
  chunks big-endian, copia de bytes, EOF, respuestas ambiguas/excedidas y timeout fail-closed.
  No es ClamAV ni evidencia de detección real de malware.
- `s3-document-store.test.ts`: AWS SDK real contra fixture HTTP local. Comprueba escritura sin
  ACL pública ni sobrescritura, integridad/cota de lectura, timeout del cuerpo, ausencia de
  credenciales en GET anónimo, rechazo de acceso público/redirects y limpieza exacta de versión.
  La fixture no es un proveedor S3 ni una auditoría de políticas reales.

Para probar servicios reales: `npm run files:check -- --network --eicar`, únicamente con
configuración privada e indicador de infraestructura aislada. Ver `document-storage-setup.md`.
Sin infraestructura el comando debe fallar antes de contactar servicios, no aprobar ni simular.

## Presentaciones en borrador
- Unitarias: fechas civiles sin desplazamiento horario, campos según revisión asignada,
  vencimiento requerido/no permitido y rechazo de autor/revisión/estado/S3 enviados por cliente.
- Integración: creación y auditoría atómicas, idempotencia, alcance antes de conteo, números y
  versiones concurrentes, configuración histórica, cancelación y restricciones SQL de conservación.
- La prueba de migración también aplica 005 sobre una obligación previa y verifica que conserve
  ID, revisión y versión, sin generar presentaciones ficticias ni dar escritura al Visualizador.
- E2E documental ampliado en escritorio/móvil: preparar, editar, confirmar/cancelar, consultar
  como visualizador, rechazar escrituras y origen no autorizado. Capturas propias de borrador/cancelada.
- Las filas históricas de esa suite se conservan en la base QA desechable; no desactivar triggers
  ni borrar evidencia para limpiar fixtures. El harness elimina el entorno, no registros del cliente.

Resultados efectivamente ejecutados: `IMPLEMENTATION_PLAN.md`.
