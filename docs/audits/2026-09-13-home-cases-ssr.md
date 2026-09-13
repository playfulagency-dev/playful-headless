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

Checks del PR y validación del artefacto desplegable. No se ha acreditado todavía ausencia de errores de consola. No se publicó producción ni se enviaron formularios.

## Revisión independiente y comparación contra base

El revisor independiente no identificó regresiones críticas: 5/5 pruebas SSR y 19/19 pruebas relacionadas con Shopify, enlaces y política de imágenes. Base e9ccb5f ejecutada separadamente en 3095; candidato b916798 en 3094.

Comparación automatizada del DOM renderizado y sus medidas: igualdad de ambos títulos, enlaces, imágenes y dimensiones. En escritorio de 1280 px: tarjetas 326 × 500 e imágenes de 192 px de alto. En móvil de 390 px: slides 273 × 500, imágenes de 192 px; fuente de titulares 20 px y color rgb(17,24,39) iguales. Inspección de capturas del candidato escritorio y de ambos móviles sin diferencias del diseño de tarjetas observadas. No es una comparación pixel-perfect. El chat flotante existente tapa parte de la tarjeta en ambas versiones móviles; no fue introducido por este parche.

Rollback: revert del commit del componente y sus pruebas; sin migraciones ni cambios de datos.
