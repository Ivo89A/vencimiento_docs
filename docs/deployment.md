# Despliegue — base inicial, no entrega de producción

## Plataforma
Runtime Node compatible con Next.js standalone. PostgreSQL administrado o servidor persistente.
Preparar S3 privado, SMTP y worker separado antes de habilitar módulos documentales.
No asumir persistencia del filesystem de la instancia web.

## Pasos
1. Configurar secretos mediante gestor de secretos (no en Git ni variables NEXT_PUBLIC).
2. `npm ci` y `npm run build`. La compilación no usa credenciales ni se conecta a PostgreSQL.
3. Respaldar BD; ejecutar `npm run db:deploy` con rol de migración.
4. Aprovisionar administrador con CLI desde un entorno autorizado.
5. Arrancar con `npm start` o empaquetar `.next/standalone` con `.next/static`.
6. Terminación TLS y `BETTER_AUTH_URL=https://...` consistente con el origen público.
7. Verificar login, recuperación, alcances y rechazo de escritura desde un visualizador.

## Controles antes de producción
- Rol de runtime PostgreSQL sin DDL; auditoría solo INSERT/SELECT, sin UPDATE/DELETE.
- Pool y límites de conexiones por instancia dimensionados al servidor.
- Proxy con límites de cuerpo y tiempos, rate limit adicional y cabeceras de seguridad.
- Política CSP comprobada con visor y frontend; HSTS en el punto de terminación TLS.
- Respaldos y restauración probada de BD y objetos; política de retención definida con el cliente.
- Logs sin secretos y alertas de errores, backups y jobs fallidos.
- Pruebas de integración/E2E completas y revisión de dependencias.
- Scanner antimalware fail-closed y objetos privados antes de habilitar carga.

Los módulos pendientes en el plan bloquean la aceptación integral. Este documento no certifica
preparación productiva por el solo hecho de que se pueda compilar o arrancar Next.js.
