# Gestión documental — instrucciones del proyecto

Leer `IMPLEMENTATION_PLAN.md` y `docs/HANDOFF.md` al retomar el trabajo. Nunca reconstruir módulos existentes sin inspeccionarlos.

## Skills
Para interfaz cargar `.agents/skills/frontend-design`, `ui-ux-pro-max`, `shadcn`;
para revisión final `web-design-guidelines` y `polish`. `polish` es un alias local
al flujo oficial incluido en `impeccable`. Sistema visual vigente: `DESIGN.md`.

Las skills locales están en `.agents/skills/`. Antes de trabajar en Next.js o datos,
cargar `next-best-practices`, `nextjs-datos-consistentes` y las referencias pertinentes.
Para arquitectura usar `agent-navigable-code`; para autenticación, `better-auth-best-practices`.
Las referencias a CIMA, Drizzle, agencias o subcuentas en esas skills son del proyecto de origen,
no reglas de este producto. No modificar la carpeta externa de origen.

## Estructura y seguridad
- Dominios en `src/domains/<dominio>`, persistencia en `src/infrastructure`.
- Rutas y acciones delgadas; autorización también dentro del servicio de negocio.
- Consultas proyectadas, acotadas, con permiso y alcance antes de contar/paginar.
- Mutaciones y auditoría en la misma transacción; conservar evidencias históricas.
- No exponer secretos, claves S3, tokens ni contraseñas en logs/DTOs/auditoría.
- No usar `db push` como mecanismo de despliegue; revisar migraciones reales.
- No agregar páginas de relleno ni botones sin función para simular progreso.
- Actualizar el seguimiento con evidencia real. Declarar pruebas bloqueadas.

## Verificación
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
Integración y E2E requieren infraestructura indicada en README y una base de prueba aislada.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
