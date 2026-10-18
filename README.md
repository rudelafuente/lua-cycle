# Lúa · 0.3

PWA personal de ciclo menstrual en español. Aplicación estática para GitHub Pages, sin backend, cuentas, analítica, fuentes remotas ni dependencias de producción. Esta entrega no contiene datos personales ni exportaciones reales de Flo.

## Funciones

- Registro, edición y borrado de reglas, con comprobación de fechas y solapamientos.
- Calendario con distinción entre registro real y previsión orientativa.
- Previsión de siguiente regla usando mediana de hasta seis intervalos; no desplaza ciclos atrasados automáticamente.
- Orientación general de deseo y correcciones opcionales (menos / habitual / más). No se infiere nada del silencio.
- Adaptación local experimental por cuatro tramos: mínimo seis respuestas de tres ciclos en un tramo y 2/3 de coincidencia. No constituye validación estadística o clínica ni confirma ovulación. No es anticonceptivo.
- IndexedDB local con transacciones y detección de escrituras desde otra ventana.
- Copias manuales cifradas AES-256-GCM, clave derivada por PBKDF2-SHA256 con 600.000 iteraciones, sal e IV aleatorios. Contraseña mínima 12 caracteres; no se conserva. Restauración validada y confirmada.
- CSV de reglas: selección de columnas de inicio/fin, formato explícito de fecha, vista previa y deduplicación. También JSON de Lúa sin respuestas; para restauración completa, copia cifrada.
- **Importación de ciclos transcritos desde Flo**: admite `cycle-history-json` versión 1.0, conserva ciclos como referencias distintas del sangrado y mantiene las previsiones como no confirmadas. No es el formato oficial completo de Flo. No admite PDF, ZIP ni esquemas JSON arbitrarios.
- Demo en memoria separada de los datos reales, diseño móvil, manifest y service worker para uso sin conexión.

## Privacidad y conservación

No introducir registros reales hasta terminar la prueba en el iPhone de destino. Instalar en inicio antes de importar: la ventana Safari y la PWA pueden tener almacenes separados.

Los datos locales no están cifrados por la aplicación ni protegidos por Face ID. Las copias exportadas sí se cifran. La seguridad de acceso local depende del dispositivo y del origen web. El alojamiento recibe solicitudes normales para descargar código, nunca los registros desde esta aplicación. Una actualización de código comprometida podría acceder al almacenamiento: proteger el repositorio, revisar cambios y no añadir scripts de terceros.

**Un repositorio separado bajo `rudelafuente.github.io/otro-proyecto/` NO crea un origen de seguridad separado de `familia-dashboard`.** Para datos sensibles, usar un hostname exclusivo mediante dominio/subdominio personalizado o una cuenta/organización GitHub dedicada. Distintas rutas comparten origen. No desplegar junto a aplicaciones que ejecuten contenido no confiable.

La persistencia web puede no concederse. El borrado de datos web o la pérdida del dispositivo puede eliminar el historial. Las copias son manuales: exportar y guardar mediante Archivos/iCloud Drive. “Copia preparada” no confirma que el usuario haya guardado el archivo. No existe sincronización automática con iCloud.

## Comprobar y publicar

Requiere Node 22 o posterior para las pruebas; la aplicación no requiere compilación ni paquetes.

```sh
npm test
node package.mjs
```

El directorio `dist` contiene únicamente archivos de la aplicación. GitHub Pages publica directamente desde la raíz de la rama `main` (Settings → Pages → Deploy from a branch). Ejecutar `npm test` antes de subir cambios. La publicación inicial comparte origen con los demás proyectos de la cuenta; configurar un hostname exclusivo antes de almacenar datos sensibles si se requiere aislamiento entre aplicaciones.

Abrir directamente `index.html` como `file://` no es una instalación válida. Se necesita HTTPS (o localhost para desarrollo) para módulos, service worker y criptografía.

El contenido publicado es el código, nunca copias, historial ni archivos de importación. No añadirlos al repositorio.

## Actualizaciones

Al cambiar archivos cacheados, subir la versión de `CACHE` en `sw.js`. El nuevo service worker espera al cierre de las ventanas anteriores para evitar mezclar código de versiones diferentes. Preservar el esquema de datos o implementar migraciones explícitas antes de cambiarlo.

## Prueba pendiente en iPhone

1. Instalar desde Safari; abrir desde el icono.
2. Probar reglas con datos ficticios, editar y borrar.
3. Cerrar y reabrir sin conexión.
4. Exportar copia a iCloud Drive, borrar datos ficticios y restaurarla.
5. Confirmar rechazo de contraseña errónea y CSV solapado.
6. Probar importación del formato real de Flo en el dispositivo tras adaptar el lector.

Las pruebas automatizadas cubren fechas, solapamientos, deduplicación, cálculo, aprendizaje y cifrado. No sustituyen la validación visual, de IndexedDB y de instalación en Safari/iOS, que está pendiente.

## Diseño 0.2
Resumen de ciclo, vista semanal, check-in opcional de un toque, formularios inferiores en móvil, accesos Hoy/Ayer y calendario con marcadores separados para referencias importadas. No se migran ni borran datos existentes.

## Bienestar y diseño 0.3
Paleta lila y morada. Hoy muestra dos consejos educativos basados en NHS (PMS y period pain, consultados 18/10/2026), con fuentes accesibles. La selección usa fechas orientativas y prioriza respuestas afirmativas de los últimos 90 días; no predice síntomas ni confirma fases hormonales. Las respuestas diarias se pueden corregir o deshacer y se conservan en las copias cifradas mediante el campo opcional tipResponses. Las copias anteriores se mantienen compatibles.
La actualización de versiones posteriores ofrece un botón que activa el worker en espera y recarga. Para versiones antiguas: actualizar.html renueva solo la caché de aplicación sin borrar IndexedDB.
