# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Propósito

Lúa es un **sustituto personal de Flo**: una app para registrar y seguir el ciclo menstrual sin depender de Flo ni de ningún servicio externo. Es una PWA en español que se instala en el iPhone desde Safari y guarda todo en el propio dispositivo. No tiene cuentas, servidor, analítica ni dependencias de terceros.

Lo que cubre de Flo:

- Registrar las reglas (inicio y fin), editarlas y borrarlas.
- Un registro diario opcional: sangrado, dolor, ánimo, síntomas y nota.
- Un calendario que distingue lo registrado de lo previsto, con previsión de varios meses.
- La previsión de la siguiente regla y del día del ciclo.
- Un historial con estadísticas y un resumen exportable para la consulta médica.
- Un check-in de deseo opcional y consejos de bienestar.

Fuera de alcance por decisión: recordatorios o notificaciones (no hay backend).

Lo que lo diferencia de Flo:

- Los datos nunca salen del dispositivo. Las únicas copias son manuales y van cifradas.
- Las previsiones y orientaciones son prudentes y explican de dónde salen.

**Migración desde Flo.** Es una pieza central del proyecto: el historial previo vive en Flo y hay que traerlo sin perder fidelidad.

- Hoy se admite un JSON transcrito (`cycle-history-json`, versión de esquema `1.0`) y CSV de reglas.
- Aún **no** se admite la exportación oficial completa de Flo. Para soportarla hay que escribir un lector nuevo a partir de un archivo real. No conviertas formatos a ciegas.
- Los ciclos importados son *referencias de ciclo*, no días de sangrado confirmados.

Al proponer funciones nuevas, la referencia es "lo que hacía Flo y me hacía falta". Se aplican siempre los límites de privacidad y prudencia de abajo.

## Comandos

- Tests (Node 22+): `npm test` (ejecuta `node --test`, que encuentra `*.test.js`).
  - `core.test.js` cubre la lógica y `tips.test.js` las pistas y patrones.
  - `views.test.js` cubre el render de las vistas en Node, el escape de HTML, los exportes y que la versión y `ASSETS` estén sincronizados.
- Un solo test: `node --test --test-name-pattern="AES-GCM"`
- Generar `dist/` limpio: `node package.mjs`. Toma la lista de archivos de `ASSETS` en `sw.js`.
- Probar en local: servir la raíz por `localhost` (p. ej. `python3 -m http.server`). Con `file://` no funcionan los módulos, el service worker ni Web Crypto.
- Despliegue: GitHub Pages publica la raíz de `main` tal cual. No hay compilación, linter ni formateador.

## Arquitectura

Módulos ES nativos cargados desde `index.html`:

- `core.js` — lógica pura, sin DOM, por eso se prueba con Node. Incluye:
  - `VERSION`.
  - Fechas como cadenas `YYYY-MM-DD`, calculadas a `T12:00:00Z` para evitar problemas de horario de verano.
  - `validate()` y el vocabulario del registro diario (`LOG`).
  - Previsión: `cycleAnchors` → `cycleIntervals` → `cycleStats` → `forecast`, más `projections`.
  - `closeOpenBefore` y `staleOpen` (reglas sin cerrar), `cycleHistory`, `logSummary` y `desireEstimate`.
  - `cycleStatus` y `dayInfo`, que alimentan el resumen «de un vistazo» del calendario.
  - Lectura de CSV, importación de Flo (`importCycleHistory`) y las copias cifradas (`encrypt`/`decrypt`).
- `tips.js` — las «pequeñas pistas»: un catálogo de temas breves con fuente del NHS.
  - Lo anotado en el registro diario cuenta como respuesta: `matches`/`answer`, y `applyAnswer` escribe en `logs`.
  - `patterns()` detecta patrones propios (misma ventana de 3 días en ≥3 de los últimos 6 ciclos anotados y en al menos la mitad).
  - `dailyTips()` ordena: primero el patrón de hoy, después lo anotado en 90 días y el contexto de la fecha.
  - Silvia prefiere insights cortos, no artículos: una línea de contexto y una acción, con cuándo consultar y la fuente plegados.
  - `TIP_IDS` está en `core.js`, porque lo usa `validate()`, y tiene que coincidir con el catálogo.
- `report.js` — exportes sin cifrar para la consulta: `reportHTML`, `cyclesCSV` y `logCSV`. Las celdas que una hoja de cálculo interpretaría como fórmula se neutralizan.
- `views/*.js` — vistas **puras**: `(state) → HTML`, sin acceso al DOM.
  - `state` = `{data, view, demo, selected, month, offlineReady, storageOK}`.
  - `shared.js` contiene `esc`, `fmt`, la navegación y las tarjetas comunes (deseo y registro diario). `modals.js` contiene el contenido de los modales.
  - Cualquier valor del usuario se escapa con `esc()`.
- `app.js` — estado mutable, DOM y eventos:
  - Pinta las vistas en `#app`.
  - Gestiona los eventos por delegación, usando atributos `data-*`.
  - Persiste a través de `save()`, que siempre pasa por `validate()` antes de `write()`.
  - Después de cada render devuelve el foco al elemento equivalente, buscándolo por sus atributos `id`/`data-*`.
  - Al volver a primer plano (`visibilitychange`) recarga los datos y actualiza "hoy".
  - El modo demo trabaja en memoria y nunca escribe.
- `storage.js` — IndexedDB `lua-private-v1`, almacén `state`, un único registro `current` = `{revision, data}`. `write()` comprueba la revisión antes de escribir y aborta si otra ventana ha escrito entre medias.
- `sw.js` — caché del shell (`lua-shell-<VERSION>`).
  - Descarga los archivos con `cache:'reload'` para no mezclar versiones.
  - El nuevo worker espera hasta que la página le envía `SKIP_WAITING`.
  - `actualizar.html` es una página de rescate que borra el worker y las cachés sin tocar IndexedDB.

### Modelo de datos

`validate()` es el único punto de control del esquema (`version: 1`). Por ahí pasan los guardados, las importaciones y las restauraciones. Normaliza los datos y rechaza fechas futuras, solapamientos, más de una regla abierta y duplicados.

- `periods` — sangrado confirmado, con la forma `{start, end|null}`. Una regla abierta desde hace `STALE_OPEN` días o más se considera olvidada.
- `logs` — registro diario `{date, flow, pain, mood[], symptoms[], note}`. `validate()` descarta los días vacíos y ordena las etiquetas según `LOG`. Marcar sangrado nunca crea una regla.
- `cycles` — referencias importadas de Flo (`bleedingConfirmed: false`). Pueden incluir `periodDays`, que en el JSON es `period_length_days`: días de regla importados, sin confirmar. `importedPeriodOn()` los muestra en el calendario y `cycleStats` los usa para la duración solo si no hay reglas registradas (`durationSource`). `cycleAnchors()` las combina con `periods` para la previsión: una regla a `ANCHOR_TOLERANCE` (7) días o menos sustituye a la referencia. La interfaz nunca debe presentarlas como sangrado confirmado.
- `desire` (valor de 0 a 2), `tipResponses` (`{date, tip, value:boolean}`), `settings` y `lastBackup`.

Las copias antiguas tienen que seguir restaurándose:

- Los campos nuevos deben ser opcionales y recibir un valor por defecto en `validate()`, como se hizo con `tipResponses`.
- Cualquier otro cambio de esquema requiere una migración explícita.
- `decrypt()` comprueba de forma estricta el formato de la copia cifrada: `lua-encrypted` v1, PBKDF2-SHA256 con 600.000 iteraciones, sal de 16 bytes e IV de 12 bytes.

## Convenciones y límites

- **Idioma:** los textos de la interfaz y los mensajes de error van en español. Los errores se lanzan como `Error('…')` y se muestran tal cual al usuario.
- **Estilo de código:** compacto, con funciones de una línea, nombres cortos y casi sin comentarios. Hay que respetarlo.
- **CSP estricta en `index.html`:** solo se permiten recursos `self`. Nada de scripts o estilos en línea, CDN ni fuentes externas, y ninguna llamada de red con datos del usuario.
- **Archivos publicados:** al añadir o renombrar un archivo publicado, actualiza `ASSETS` en `sw.js`. El test falla si falta un módulo importado.
- **Versión:** en cada versión, sube `VERSION` en `core.js` y en `sw.js`, y `version` en `package.json`. El test comprueba que coinciden.
- **Reglas de producto, cubiertas por los tests:**
  - No inferir nada del silencio: no responder no cuenta como respuesta.
  - No mover automáticamente una previsión atrasada, y no proyectar a partir de ella.
  - Los intervalos atípicos se muestran, pero no se usan en la previsión.
  - No cerrar una regla sin confirmación.
  - No inventar sangrado a partir de referencias importadas.
  - La tendencia personal de deseo exige al menos 6 respuestas de 3 ciclos distintos en el mismo tramo del ciclo, con al menos 2/3 de coincidencia.
  - No afirmar ovulación, fertilidad ni uso anticonceptivo.
- **Datos reales:** no subir nunca al repositorio datos reales, exportaciones de Flo ni archivos `*.lua-backup`.
- **Pendiente:** la validación manual en iPhone (instalación, IndexedDB, uso sin conexión, copias en iCloud Drive) y el lector para la exportación real de Flo. Los tests no cubren nada de esto.
