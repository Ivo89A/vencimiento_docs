# Preparación del hito 2 — infraestructura privada

El usuario eligió reutilizar infraestructura existente, no instalar Docker localmente.
Después aclaró que **todavía no dispone de almacenamiento S3 ni antimalware**. Por lo tanto,
hay que elegir y preparar ambos servicios antes de las pruebas reales. Este documento es
el contrato requerido, no evidencia de servicios disponibles. No se autorizó contratar
cuentas, modificar infraestructura externa ni instalar Docker automáticamente.
El primer hito ya permite configurar/asignar obligaciones, pero no carga ni sirve archivos.
No enviar secretos por chat ni registrarlos en seguimiento/auditoría.

## S3 privado
El responsable de infraestructura debe preparar:
- Bucket **aislado de prueba**, sin acceso público ni políticas anónimas.
- Endpoint HTTPS, región, nombre del bucket y credenciales de mínimo privilegio.
- Credenciales limitadas a ese bucket/prefijos de prueba. No utilizar acceso administrador
  ni claves con permiso general sobre buckets o documentos de producción.
- Prefijos de cuarentena y archivos validados. Solo el backend accederá a objetos inicialmente;
  no es necesario habilitar CORS público ni exponer el bucket al navegador.
- Identificar proveedor y capacidades S3, incluido si requiere path-style. No suponer que
  todas las implementaciones aceptan la configuración de AWS sin adaptación.

Configurar mediante gestor de secretos/entorno o `.env` local ignorado por Git:

```dotenv
S3_ENDPOINT=https://endpoint-del-servicio
S3_REGION=region-del-proveedor
S3_BUCKET=bucket-aislado-de-pruebas
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_SESSION_TOKEN=
S3_FORCE_PATH_STYLE=false
DOCUMENT_FILES_MAX_BYTES=10485760
DOCUMENT_FILES_TIMEOUT_MS=30000
```

Los valores anteriores son marcadores, no una configuración operativa. Completar las claves
solo en el entorno privado; no pegarlas en chat. No sustituir DATABASE_URL ni credenciales
existentes por valores de `.env.example`. La vista local utiliza su propia base aislada.

## Antimalware
La primera integración prevista es ClamAV/clamd con análisis por flujo (`INSTREAM`), no una
respuesta simulada. Confirmar que el servicio existente ofrece ese protocolo y tiene firmas
actualizadas. Si usa una API HTTP de otro proveedor, identificarla antes de programar el adaptador.

```dotenv
ANTIVIRUS_HOST=
ANTIVIRUS_PORT=3310
```

Clamd TCP no aporta autenticación/cifrado por sí solo: **no exponerlo a Internet**. Acceder por
red privada/VPN/túnel seguro desde el backend. Host y puerto no deben apuntar a un servicio
público sin protección. Configurar límites de tamaño de flujo y tiempo de análisis.

El adaptador implementado rechaza IPs TCP públicas, respuestas DNS mixtas público/privado,
direcciones sin especificar y link-local. Conecta a la IP validada para evitar una segunda
resolución DNS. Para un servicio remoto usar una red privada/VPN o túnel local; si se elige
una API HTTP de otro proveedor hará falta su adaptador, no basta cambiar el hostname.

### Configuración necesaria del daemon
- `INSTREAM` disponible, firmas oficiales cargadas y actualización periódica con `freshclam`.
- `StreamMaxLength` y `MaxFileSize` al menos iguales al límite de aplicación (10 MiB inicial).
- Revisar `MaxScanSize`, límites de documentos/contenedores y tiempos del daemon.
- Activar `AlertExceedsMax yes` para que exceder límites de análisis no pase como limpio.
- Definir política de documentos cifrados, incluida `AlertEncrypted yes` cuando corresponda;
  el próximo validador documental también deberá rechazar formatos no inspeccionables.
- Restringir red/firewall al backend autorizado. Si se usa túnel local, escuchar en loopback.

Referencia de protocolo: https://docs.clamav.net/manual/Usage/ClamdProtocol.html

## Diagnóstico implementado

Primero cargar la configuración privada, sin sustituir datos de autenticación/BD, y ejecutar:

```bash
npm run files:check
```

Solo valida variables, límites, tipos y transporte. No contacta servicios, no analiza documentos
ni habilita cargas. Si falta configuración, falla con nombres de variables, sin sus valores.

Para probar servicios reales en infraestructura **aislada y autorizada**, configurar
`DOCUMENT_FILES_VERIFY_ISOLATED=true` en ese entorno no productivo y ejecutar:

```bash
npm run files:check -- --network
npm run files:check -- --network --eicar
```

La prueba S3 escribe un objeto aleatorio en cuarentena, lo relee y verifica SHA-256, comprueba
que GET anónimo sea denegado (sin credenciales y sin seguir redirects) y elimina su propia
versión/objeto confirmando ausencia. Nunca crea buckets ni cambia políticas. Requiere permisos
de escritura/lectura y eliminación del objeto de prueba; con versionado, también eliminar
esa versión. Usar credenciales de diagnóstico limitadas al bucket de prueba, no ampliar
innecesariamente las credenciales del futuro servidor productivo.

La opción `--eicar` requiere autorización: puede generar alertas en el servicio antivirus.
Usa únicamente el archivo de prueba estándar inofensivo, enviado en memoria al analizador;
no lo guarda en S3 ni en el disco. Sin esa opción, solo se prueba contenido benigno.

Un diagnóstico exitoso no certifica todas las políticas del bucket, sus backups/cifrado ni
la actualización de firmas; requiere revisión del proveedor y pruebas del flujo documental.
Si una escritura queda incierta o una limpieza falla, revisar cuarentena del bucket de prueba;
no asumir eliminación. Los adaptadores actuales no sustituyen la futura reconciliación durable.

**Estado actual:** adaptadores y diagnóstico implementados. No hay todavía infraestructura
real configurada, rutas de carga, validación PDF/imagen, presentaciones, renovación ni visor.
Las pruebas automatizadas de protocolo con fixtures no son evidencia de S3/ClamAV operativos.

## Antes de habilitar las cargas
1. Confirmar acceso del backend al bucket de prueba y al servicio de análisis.
2. Implementar migración de solicitudes/adjuntos/presentaciones e integración S3/antimalware.
3. Verificar cuarentena inaccesible, límites, formato real y análisis fallido con denegación.
4. Probar archivo limpio y archivo de prueba EICAR autorizado, sin usar malware real ni
   buckets ajenos/productivos. EICAR debe quedar bloqueado y no aportar cumplimiento.
5. Verificar acceso cruzado, permisos de visualización/descarga, renovación e historial.
6. Habilitar visor protegido y recién después avanzar a estados, calendario y alertas.

No crear ni modificar automáticamente buckets/políticas externas. La falta de infraestructura
o una prueba fallida debe quedar declarada como bloqueo; no habilitar descargas públicas ni
aprobar adjuntos manualmente para sortear el análisis.
