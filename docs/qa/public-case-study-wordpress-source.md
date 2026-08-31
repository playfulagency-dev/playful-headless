# QA de claims en la fuente WordPress

## Riesgo vigente

La web pública ya sustituye los textos no sustentados de Jumex y Odwalla, pero la API REST pública de WordPress conserva los originales. El 31 de agosto de 2026 se verificaron los registros `86237` y `86235`, ambos modificados por última vez el 30 de diciembre de 2025.

Mientras la fuente siga sin sanear, buscadores, integraciones o clientes de la API pueden recuperar resultados comerciales y testimonios que la web oculta.

## Control automatizado

`scripts/public-case-study-source-audit.mjs` compara la fuente REST con la allowlist técnica que ya usa la web. Comprueba el título, resumen y cada campo ACF sustituido. Cualquier campo ACF adicional falla la auditoría, salvo la allowlist cerrada de recursos visuales (`imagenbanner`, `imagenminuta1`–`imagenminuta6`, `desafioimagen1`–`desafioimagen4`, `imagendesarrollo`, `grilla1`–`grilla8`, `telefono1`–`telefono4` y `telefonos`). El informe muestra únicamente rutas, nunca los valores recuperados.

Ejemplo de ejecución contra un entorno autorizado:

```sh
PUBLIC_CASE_STUDY_WORDPRESS_BASE_URL=https://wpqa.playfulagency.com npm run audit:public-claims-source
```

La prueba unitaria no necesita red:

```sh
npm run test:public-claims-source
```

## Puerta de publicación

1. Exportar los dos registros y sus ACF antes de modificarlos; conservar el archivo como rollback.
2. Aplicar en `wpqa` exactamente la allowlist de `utils/public-case-study-overrides.json`, incluida la eliminación explícita de contenido heredado mediante `soytechno: false`.
3. Ejecutar el audit hasta obtener PASS y verificar en Preview las fichas, recursos permitidos, CTA y responsive.
4. Entregar el paquete de aceptación a José. Un fallo devuelve la tarea a `qa:cambios-solicitados`.
5. Solo después de su aprobación, aplicar la misma allowlist a producción, ejecutar el audit y realizar el smoke de las dos fichas.

El cambio de WordPress y su respaldo siguen pendientes; esta rama únicamente añade verificación y documentación.
