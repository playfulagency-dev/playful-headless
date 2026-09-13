# Home: casos disponibles en HTML inicial

Card: https://app.clickup.com/t/86cbh2p34

## Resultado local

El componente renderiza los casos suministrados en servidor. Conserva los datos, enlaces y política de imágenes existentes; la carga remota sigue disponible cuando no recibe casos. Las respuestas tardías no reemplazan props nuevas. Las imágenes no dependen de un evento JavaScript para ser visibles.

## Evidencia — 13/09/2026

- Agente Web: 8/8 pruebas SSR, cambios de props, respuesta tardía y allowlist; TypeScript correcto.
- Compilación aislada Next 15.5.25 en modo `compile`: exit 0. No equivale a generación estática completa.
- Coordinador: revisión del diff y ejecución independiente de 5/5 pruebas del archivo SSR.
- GET local `/` en 3094: HTTP 200; el bloque `carousel-container` contiene Jumex y Odwalla, imágenes y enlaces, sin «Cargando casos de éxito».
- Navegador local escritorio: ambas imágenes cargadas (`naturalWidth > 0`), tarjetas de 326 px.
- Navegador local 390 × 844: tarjeta activa 0/Jumex; al pulsar Next, tarjeta activa 1/Odwalla; imágenes cargadas. Ancho del cuerpo 375 px frente a viewport 390 px. Tamaño del visor restaurado.

## Pendiente antes de cierre

Comparación visual automatizada contra la versión base, checks del PR y validación del artefacto desplegable. La inspección del DOM no sustituye la comparación visual; no se ha acreditado todavía ausencia de errores de consola. No se publicó producción ni se enviaron formularios.

Rollback: revert del commit del componente y sus pruebas; sin migraciones ni cambios de datos.
