# Política de dependencias

Se consultaron versiones, engines y peerDependencies en el registro npm antes de instalar.
`package-lock.json` fija la resolución completa; usar `npm ci` en CI y despliegue.

## Decisiones verificadas
- Next 16.4.3, React/React DOM 19.3.1; Node local 22.19 compatible con engines publicados.
- Prisma CLI, Client y adapter-pg 7.10.1 alineados. La etiqueta latest de CLI devolvía una RC
  de Prisma 8 y no se adoptó.
- TypeScript 5.9.3: TypeScript 7 queda fuera del rango declarado por typescript-eslint.
- @hookform/resolvers 5.2.2: mantiene compatibilidad con React Hook Form 7 y Zod 4 sin exigir
  la resolución de múltiples peers opcionales de otros motores de validación. La versión 7
  generaba con npm 10 un lockfile no reproducible para AJV/Effect, detectado ejecutando `npm ci`.
  Se eligió una versión estable no deprecada y se repiten typecheck, pruebas e instalación limpia.
- Se reemplazó el agregado `eslint-config-next` por plugins oficiales configurados explícitamente:
  ESLint 10, @eslint/js, @next/eslint-plugin-next, typescript-eslint y React Hooks. El agregado
  incluía plugins legacy con peers limitados a ESLint 9; ESLint 9 a su vez publicó aviso de EOL.
  Esto conserva reglas Next Core Web Vitals, TS y Hooks sin forzar dependencias incompatibles
  ni dejar un linter sin mantenimiento. La accesibilidad se revisa también en E2E y no se afirma
  que estas reglas reemplacen una auditoría WCAG completa.
- SMTP-server y Mailparser son exclusivamente herramientas de prueba; no se despliegan como
  parte del servicio de correo de la aplicación.
- El empaquetado beta de binarios PostgreSQL se usó solo en el temporal externo para pruebas.
  `SHOW server_version` confirmó PostgreSQL 18.6 real; no es una dependencia productiva.

No usar `audit fix --force` ni overrides de majors transitivas sin comprobar API y tests.
Las advertencias restantes se anotan en el seguimiento; un audit sin alertas no certifica
ausencia de vulnerabilidades ni reemplaza revisión de permisos, flujos y despliegue.
