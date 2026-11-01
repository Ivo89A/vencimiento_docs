# Skills de interfaz instaladas en este proyecto

Se conservan en `.agents/skills/` para futuras sesiones; no son dependencias de la
aplicación ni cargan código en el navegador.

| Nombre | Origen | Uso |
| --- | --- | --- |
| frontend-design | `anthropics/skills` | Dirección visual y composición |
| ui-ux-pro-max | `nextlevelbuilder/ui-ux-pro-max-skill` | Búsqueda local de patrones y criterios UX |
| web-design-guidelines | `vercel-labs/agent-skills` | Revisión de accesibilidad e interacción web |
| shadcn | `shadcn-ui/ui` | Componentes, variantes y tokens |
| impeccable | `pbakaus/impeccable` | Referencias de diseño y revisión de calidad |
| polish | Alias local a `impeccable/reference/polish.md` | Revisión final por el nombre solicitado |

La distribución actual de Impeccable ya no publica `polish` como skill independiente.
Se descargó Impeccable completo y se dejó un alias explícito, sin atribuir ese alias
al autor original. Las otras carpetas conservan sus recursos y licencias originales.
`skills-lock.json` registra las instalaciones que finalizó el CLI. La descarga de
UI/UX Pro Max se interrumpió al reiniciar el servidor después de copiar sus recursos;
su `SKILL.md`, scripts y datos se comprobaron ejecutando búsquedas locales con Python.

## Reutilización
1. Leer `DESIGN.md` y las instrucciones en `AGENTS.md`.
2. Cargar las skills por su nombre. Si el agente no las descubre automáticamente,
   leer `.agents/skills/<nombre>/SKILL.md`.
3. Aplicar las referencias que correspondan, adaptadas al stack existente.
4. No ejecutar actualizaciones de componentes, presets ni scripts ajenos sin revisión.

Manrope variable se aloja en `src/app/fonts/`, con licencia SIL OFL en `OFL.txt`.
Origen: `google/fonts`, carpeta `ofl/manrope`. `next/font/local` evita consultas a Google
tanto durante el build como desde el navegador.
