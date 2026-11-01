# Almacenamiento y notificaciones

## Actualmente implementado
SMTP configurable para recuperación de contraseña mediante Nodemailer. Variables en `.env.example`:
host, puerto, TLS, usuario, contraseña y remitente. Credenciales solo en servidor.
Para entorno de pruebas puede usarse un buzón SMTP de captura local; producción requiere
dominio verificado, SPF/DKIM/DMARC y proveedor apropiado.
En producción se exige TLS directo o STARTTLS, con TLS mínimo 1.2. La captura SMTP sin TLS
solo se usa ligada a localhost en el harness de pruebas, nunca como proveedor productivo.

## Diseño pendiente — no se implementó aún
- Bucket S3 privado y bloqueo de acceso público. No usar `/public` ni filesystem efímero del hosting.
- Variables `S3_*` previstas en `.env.example`; todavía no existe cliente ni flujo de carga.
- Cuarentena, detección por contenido, límite de tamaño, antivirus fail-closed y metadatos en BD.
- Visor PDF/imágenes con permisos, historial y descargas independientes.
- Worker de vencimientos, outbox transaccional, alertas deduplicadas y notificaciones internas.
- Reintentos seguros de correo y resúmenes configurables.

No ingresar credenciales externas hasta habilitar y probar el módulo correspondiente.
