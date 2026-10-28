# PLAN MAESTRO: POS-FERIA (Samsung Galaxy A36 5G)

## 1. Confirmación de Entorno
- Directorio de trabajo exclusivo: `/home/devnate/Documents/pos-feria/` (creado).
- Subcarpeta de íconos: `/home/devnate/Documents/pos-feria/icons/` (creada).
- CLIs disponibles:
  - `agy` en `/home/devnate/.local/bin/agy`
  - `opencode` en `/home/devnate/.opencode/bin/opencode`

## 2. Estructura de Archivos
```
pos-feria/
├── index.html        # UI generada con Google Stitch + Tailwind CSS (OLED #000000, 35/65 layout, grid 2x3, barra cobro)
├── app.js            # Lógica pura JS Vanilla ES6+ (estado en memoria, vibración 15-30ms, WakeLock)
├── sw.js             # Service Worker con estrategia cache-first (100% offline / modo avión)
├── manifest.json     # PWA standalone (#000000, portrait)
├── icons/            # Íconos PWA (icon-192.png, icon-512.png)
└── PLAN.md           # Plan maestro y bitácora del orquestador
```

## 3. Asignación de Agentes y CLIs
- **Orquestador (Antigravity)**: Planifica, coordina, delega tareas independientes a subagentes/CLIs, revisa código y valida integración. No escribe código de aplicación directamente.
- **Fase 1 (UI - Stitch)**:
  - Conexión a Google Stitch (StitchMCP) para generar pantalla acorde a especificaciones: OLED true black #000000, 35% superior lectura / 65% inferior táctil, botones masivos (Soie, Venus, Paris, Yan, Channel, Moly con borde ámbar), barra de cobro (50, 100, 150, 200, Deshacer, Nuevo Cliente).
  - Entregable: `pos-feria/index.html`.
  - Nota: Si la herramienta Stitch requiere exportación manual por parte del usuario, se solicitará de inmediato respetando la regla.
- **Fase 2 (Lógica Vanilla JS - Agente OpenCode/agy)**:
  - Delegado mediante `opencode run` / `agy -p` ejecutándose en `/home/devnate/Documents/pos-feria/`.
  - Entregable: `pos-feria/app.js`.
  - Funcionalidad: Total acumulado en memoria, cálculo de vuelto o faltante al tocar billetes, vibración háptica de 15–30ms en cada botón, WakeLock permanente y reactivable en `visibilitychange`, Deshacer ítem por ítem y reseteo Nuevo Cliente.
- **Fase 3 (PWA Offline - Agente OpenCode/agy)**:
  - Delegado mediante `opencode run` / `agy -p` ejecutándose en `/home/devnate/Documents/pos-feria/`.
  - Entregables: `manifest.json`, `sw.js`, CSS local (para evitar dependencia de CDN externo en modo avión) e íconos en `icons/`.
- **Fase 4 (Validación e Integración)**:
  - Pruebas y verificación de checklist en emulador Samsung Galaxy A36 (19.5:9, 1080x2340) y servidor local.

## 4. Orden de Ejecución
1. **Fase 0**: Aprobación del Plan (Detención y espera de OK).
2. **Fase 1**: Generación e integración de `index.html` vía Stitch (Detención y espera de OK).
3. **Fase 2**: Implementación de lógica en `app.js` mediante agente CLI (Detención y espera de OK).
4. **Fase 3**: Configuración PWA offline (`manifest.json`, `sw.js`, CSS local, íconos) (Detención y espera de OK).
5. **Fase 4**: Validación integral con checklist para Samsung A36.

## 5. Riesgos y Mitigaciones
- **Riesgo 1 (Tailwind por CDN en modo avión)**: Un script CDN externo deja de funcionar sin internet.
  *Mitigación*: Descargar o incrustar las clases requeridas de Tailwind en un archivo CSS local para cache-first 100% offline.
- **Riesgo 2 (WakeLock / Vibrate bloqueados por navegador)**: Políticas de seguridad restringen WakeLock y vibración sin interacción o en contextos no seguros.
  *Mitigación*: Solicitar WakeLock y vibrar en el primer evento de toque (`pointerdown`/`click`) del usuario; re-solicitar WakeLock ante `visibilitychange`.
- **Riesgo 3 (Ergonomía con una mano en Galaxy A36 - 6.6")**:
  *Mitigación*: Área de visualización en el 35% superior; toda la interacción agrupada en el 65% inferior con botones masivos sin scroll (`overflow: hidden`).

## 6. Validación por Fase
- **Fase 1**: Layout 35/65, fondo OLED #000000, 6 botones masivos + barra inferior, sin scroll.
- **Fase 2**: Verificación de suma de productos, cálculo de vuelto exacto, indicación de faltante, Deshacer, Nuevo Cliente, eventos hápticos y WakeLock.
- **Fase 3**: Auditoría de PWA, validación de `manifest.json` y Service Worker precacheando recursos locales en modo avión.
- **Fase 4**: Checklist completo en dispositivo o emulador A36 reportando estado de cada ítem.
