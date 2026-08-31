# Gobierno temporal de páginas WordPress dinámicas

## Alcance y decisión reversible

- Base: `a108e17`.
- Rama local: `codex/wp-dynamic-route-governance`.
- El cambio gobierna exclusivamente `app/[slug]`.
- Las 15 páginas legacy conservan su URL, respuesta `200`, contenido, canonical actual y enlaces. Por defecto reciben `robots: noindex,follow` mientras se aprueba su disposición final.
- No se añaden redirects, `404` ni cambios en WordPress, DNS o producción para las 15 páginas.
- Un slug nuevo que no esté en el inventario falla cerrado con `404` antes de consultar WordPress; no puede publicarse indexable por accidente.

## Inventario central

Servicios indexables (8):

1. `agencia-seo`
2. `agencia-sem`
3. `agencia-diseno-web`
4. `agencia-e-commerce`
5. `marketing-internacional`
6. `agencia-ux-ui`
7. `seo-expertos`
8. `seo-vigo`

Auxiliar (1):

1. `gracias` — conserva `noindex,follow`.

Legacy con `noindex,follow` por defecto (15):

1. `miembros-de-equipo`
2. `seo-internacional`
3. `servicio-marketing-digital`
4. `pasarela-de-pago-ecommerce`
5. `pagos-online-ecommerce`
6. `marketing-digital-espana`
7. `landing-seo`
8. `landing-page`
9. `privacy-policy`
10. `mercantil-servicios-financieros-internacional`
11. `policlinica-metropolitana`
12. `grupo-automotriz-multimarca`
13. `email-marketing`
14. `home`
15. `home-2`

El inventario ejecutable reside en `utils/wp-dynamic-route-governance.mjs`; las pruebas fijan los 24 slugs exactos y evitan duplicados.

## Feature flag

`WP_LEGACY_INDEXABLE_SLUGS` es una variable solo de servidor. Vacía o ausente mantiene los 15 slugs legacy en `noindex,follow`. Una lista separada por comas permite volver indexables únicamente slugs legacy ya inventariados y revisados. Servicios, `gracias`, valores desconocidos y slugs futuros no pueden alterarse mediante la variable.

No configurar la variable en Preview o Production hasta que exista una matriz de disposición aprobada. Nunca usar `NEXT_PUBLIC_` para este valor.

## Ausencia frente a fallo de WordPress

- Un `200` con colección vacía significa que el slug inventariado no existe y produce el `404` normal de Next.
- `404` del endpoint de colección, respuestas `5xx`, errores de red, payload inválido o timeout son fallos de WordPress y se propagan como indisponibilidad; no se convierten en ausencia.
- Las peticiones usan tres intentos acotados y un presupuesto compartido de ocho segundos.

Así se evita fijar un falso `404` durante una caída intermitente de WordPress.

## Riesgos conocidos

- `noindex` no elimina una URL del índice de forma inmediata; depende de un nuevo rastreo.
- Las 15 páginas siguen accesibles y sus enlaces siguen siendo rastreables por diseño. La disposición final queda fuera de este paquete.
- Sus canonicals continúan autocanónicos hasta que se apruebe una matriz de redirects/canonicals.
- El HTML y los assets siguen dependiendo de WordPress/Elementor.
- Activar por error un slug permitido en `WP_LEGACY_INDEXABLE_SLUGS` lo vuelve indexable; quitarlo o vaciar la variable restaura el guard.

## Borrador de paquete QA José

Este cambio afecta navegación y señales SEO perceptibles, por lo que no puede marcarse como hecho sin aceptación humana.

### Qué cambió y por qué

Se añadió una allowlist para impedir que nuevas páginas WordPress aparezcan indexables sin revisión. Las 15 páginas legacy siguen funcionando, pero quedan temporalmente en `noindex,follow` hasta decidir su destino.

### Versión bajo prueba

- Base: `a108e17`.
- Rama: `codex/wp-dynamic-route-governance`.
- Commit/HEAD evaluado: debe ser el SHA exacto del manifiesto de Vercel y registrarse en la tarea antes de entregar el paquete a José.
- Preview exacto: no existe en esta fase local. Debe crearse después de la revisión independiente y registrarse en la tarea; no usar producción para esta aceptación.
- Rollback: disponible y descrito abajo.

### Entorno recomendado

Chrome de escritorio, ventana privada, con DevTools cerrado salvo en el paso de robots. No enviar formularios ni introducir datos personales.

### Datos de prueba

- Servicio: `/agencia-e-commerce`
- Auxiliar: `/gracias`
- Legacy con mayor dependencia observada: `/grupo-automotriz-multimarca`
- Legacy de control: `/home-2`
- Slug futuro inexistente: `/qa-slug-wp-no-inventariado`

### Pasos y resultados esperados

1. Abrir cada una de las dos rutas legacy. Debe responder `200`, conservar su contenido y no redirigir.
2. Ver el código fuente y buscar `robots`. En ambas rutas legacy debe existir `noindex,follow`; no debe desaparecer el contenido ni cambiar el canonical actual.
3. Abrir el servicio. Debe responder `200`, mostrar su contenido habitual y no contener `noindex` añadido por este paquete.
4. Abrir `/gracias`. Debe responder `200` y mantener `noindex,follow`.
5. Abrir el slug futuro. Debe responder `404` y no presentar contenido recuperado de WordPress.
6. Volver a cargar las cuatro rutas válidas. Deben mantener el mismo resultado; no debe aparecer un `404` transitorio.

### Efectos secundarios que deben comprobarse

- Navegación, cabecera, pie, estilos, imágenes y enlaces internos siguen visibles en las páginas válidas.
- No hay redirects nuevos.
- No se generan correos, contactos, oportunidades, eventos de analítica ni escrituras en WordPress.

### Qué no debe ocurrir

- Ninguna de las 15 páginas legacy debe convertirse en `404` o redirect por este paquete.
- Ningún servicio debe recibir `noindex`.
- Un slug desconocido no debe publicarse con contenido o metadata de WordPress.
- Una caída de WordPress no debe presentarse como página inexistente.

### Evidencia técnica previa requerida

- Pruebas unitarias del inventario, robots, feature flag, guard de ruta y ausencia frente a fallo: `8/8` superadas con Node `24.19.0`.
- TypeScript: `tsc --noEmit` superado.
- Build: `122/122` páginas generadas. WordPress produjo respuestas `500` intermitentes ya conocidas en superficies ajenas; el build terminó correctamente.
- `git diff --check`: superado.
- Revisión crítica independiente sin P0/P1 abiertos.
- URL y manifiesto del Preview correspondientes al mismo HEAD probado.

### Resultado de QA

Registrar URL, navegador, fecha, resultado observado por paso y decisión de José. Si un paso falla, cambiar inmediatamente a `Cambios solicitados`; no desplegar.

## Rollback

1. Rollback rápido de configuración: eliminar o vaciar `WP_LEGACY_INDEXABLE_SLUGS`. Esto restablece el comportamiento seguro por defecto y no altera datos.
2. Rollback de código: revertir los commits de este paquete y redesplegar el último build estable.
3. Comprobar las 8 rutas de servicio, `/gracias`, las 15 legacy y el control inexistente.

El rollback completo devuelve las 15 páginas a su comportamiento indexable anterior, por lo que solo debe usarse ante una regresión funcional. No hay migraciones, cambios en WordPress ni datos que restaurar.
