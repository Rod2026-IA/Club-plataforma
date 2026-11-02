## Rediseño "Aurora" — plan por fases

Adoptamos la nueva interfaz que enviaste (tokens violet/cyan/peach, tipografías Instrument Serif + Space Grotesk + JetBrains Mono, hero con blobs, bottom nav, tarjetas redondeadas). **Cero cambios** a base de datos, auth, PINs, edge functions, roles ni permisos. La misma interfaz se aplica para super admin, directores, subdirectores, GM investidos y aspirantes — la única diferencia seguirá siendo la visibilidad de secciones admin (igual que hoy).

### Fase 1 — Fundaciones visuales (esta entrega)

1. **Tokens de tema Aurora en `src/index.css`**
   - Añadir variables `--bg`, `--surface`, `--surface-2/3`, `--hero-ink`, `--violet`, `--cyan`, `--peach`, `--mint`, `--rose`, `--gold`, `--lavender`, `--text`, `--text-mute`, `--text-dim`, `--line`, `--shadow`, `--nav-bg`, `--on-accent` para modo claro y oscuro.
   - Mantener los tokens shadcn actuales (`--primary`, `--background`, etc.) mapeados al nuevo Aurora para que el resto de componentes shadcn sigan funcionando.
   - Cargar fuentes Instrument Serif, Space Grotesk, JetBrains Mono desde Google Fonts.
   - Añadir keyframes `auroraFloat`, `screenIn`, `pulseGlow` y clases `.aurora-blob`, `.screen-enter`, `.live-dot`, `.tap`.

2. **Dashboard (`src/pages/Dashboard.tsx`) rediseñado al estilo Aurora Home**
   - Hero oscuro con blobs animados violet/cyan/peach, avatar + rol + nombre, título "Panel de *Actividades*" con itálica lavender.
   - Mini stats glass (ConquiKash, Racha, Clase actual) sobre el hero — mantienen los datos reales actuales.
   - Tarjeta hero "Formación" (violet) + grid 2-col "Unidad" (cyan/mint) y "Comunidad" (peach/rose).
   - Card "Actividad en vivo" con los últimos eventos reales (asistencias / evaluaciones) — si no hay endpoint listo, mostramos placeholder honesto.
   - Igual para todos los roles; admin sigue viendo accesos de admin como hoy.

3. **Bottom nav Aurora** (`Inicio · Formación · Unidad · Equipo`) reemplazando el sidebar lateral en móvil. En desktop seguimos mostrando el sidebar actual (oculto en `<md`) para no perder navegación. Toggle de tema en el header del dashboard.

4. **`PageHeader` actualizado** al estilo Aurora `ScreenHeader` (sticky, gradient opcional, blob, botón back redondeado) para que todas las páginas existentes (Año Bíblico, Mi Unidad, ConquiKash, Ideales, etc.) hereden el nuevo look sin tocar su contenido interno.

### Fase 2 — Rediseño página por página (siguientes entregas, una por turno)

5. Mi Unidad + Reportes por Unidad (acordeón con evaluaciones por miembro, tabs día/mes).
6. Comunidad (Aspirantes / Investidos con `DirectoryScreen` y avatares con stack).
7. Formación (Tarjeta GM, Clases Progresivas, Clases Avanzadas con acordeón de requisitos y level tabs).
8. ConquiKash, Ideales, Racha, AdminUsers, AdminFingerprints, MyQR, ScanQR, MemberProfile — ajuste de tarjetas, colores y tipografía a Aurora.
9. Login / Register / RecoverPin con hero Aurora.

### Garantías

- No se toca `supabase/`, `AuthContext`, edge functions, RLS, ni `pin_records` / `profiles` / `user_roles`.
- Los componentes shadcn (Button, Input, Dialog, Select…) siguen usándose; solo cambian tokens y wrappers visuales.
- Una sola interfaz para todos los roles; la diferencia es qué secciones aparecen, no cómo se ven.

### Detalles técnicos

- Fuentes vía `@import` en `index.css` (Google Fonts) — sin descargar archivos.
- Sidebar actual `AppSidebar` se oculta en móvil y aparece BottomNav nuevo; en desktop el sidebar sigue visible.
- `ThemeToggle` existente se conecta a la clase `.dark`/`.light` igual que hoy; añadimos paralelo `html.light` para Aurora.
- Refactor en archivos nuevos cuando aplique: `src/components/aurora/Hero.tsx`, `BottomNav.tsx`, `CategoryHero.tsx`, `CategoryTile.tsx`, `AuroraScreenHeader.tsx` para mantener `Dashboard.tsx` legible.

¿Avanzo con la **Fase 1** ahora?
