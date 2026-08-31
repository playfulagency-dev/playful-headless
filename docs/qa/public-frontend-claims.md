# QA José — copy técnico en superficies públicas

## Estado y versión

- Estado: preparado para generar Preview. El único dato pendiente es su origen exacto.
- Base upstream: `a108e17` (`devplayful/main`).
- Rama del fork: `codex/public-claims-frontend-v2`.
- Revisión funcional exacta evaluada: `ae1e361`.
- Cambios en WordPress o producción: ninguno.
- PR, merge o despliegue: ninguno.

## Qué cambió y por qué

Se sustituyeron afirmaciones comerciales no sustentadas por descripciones técnicas verificables en Home, Nosotros, el carrusel compartido, Contacto y el índice de proyectos. El nuevo texto describe diseño y desarrollo de ecommerce, Shopify, WooCommerce, arquitectura headless, funcionalidades e integraciones, sin atribuir métricas ni resultados comerciales.

La fuente de verdad es `utils/public-frontend-copy.json`. El carrusel ya no tiene defaults globales para sus cuatro textos visibles: Home, Nosotros y Contacto deben pasar explícitamente las mismas propiedades allowlisted. En Contacto también se sustituyó el copy comercial del CTA adyacente. Las descripciones públicas del equipo son neutrales y no atribuyen responsabilidades más allá de la participación pública en Playful Agency.

Se conservaron layout, imágenes, rutas, destinos de CTA, navegación, formularios y medios. No se modificaron textos legales, testimonios individuales, fichas dinámicas de WordPress ni datos.

## URL y entorno de prueba

- Origen de Preview: **PENDIENTE**.
- URLs exactas una vez asignado el origen:
  - `{PREVIEW_ORIGIN}/`
  - `{PREVIEW_ORIGIN}/nosotros`
  - `{PREVIEW_ORIGIN}/contactar-agencia-de-marketing-digital`
  - `{PREVIEW_ORIGIN}/casos-de-exito-agencia-de-marketing-digital`
- Navegador recomendado: Chrome actual.
- Escritorio: viewport de 1440 px de ancho.
- Móvil: viewport aproximado de 390 × 844 px.
- Datos de prueba: ninguno. No enviar el formulario.

## Pasos de aceptación y resultado esperado

1. Abrir la Home en escritorio.
   - Debe describir arquitectura, interfaz, Shopify/WooCommerce, headless, funcionalidades e integraciones.
   - El carrusel debe titularse “Proyectos de e-commerce y alcance técnico” y su botón “Ver proyectos”.
   - El CTA debe conservar su enlace a `/contactar-agencia-de-marketing-digital`.
2. Abrir `/nosotros`.
   - Historia, capacidades, visión y presentación del equipo deben usar lenguaje técnico o neutral.
   - Cada descripción del equipo debe limitarse a: “Participa en proyectos de Playful Agency según el alcance definido.”
   - El rol público, nombre, imagen y orden deben conservarse.
3. Abrir `/contactar-agencia-de-marketing-digital` sin completar campos.
   - El formulario debe conservar su apariencia y comportamiento previo.
   - El carrusel debe usar exactamente el mismo título, subtítulo, cierre y botón de Home/Nosotros.
   - El CTA inferior debe comenzar con “Revisemos la base técnica de tu e-commerce”.
4. Abrir `/casos-de-exito-agencia-de-marketing-digital`.
   - Hero, introducción, metadatos y CTA deben describir alcance técnico sin prometer resultados comerciales.
   - Tarjetas, filtros, imágenes y enlaces a casos deben conservarse.
5. Repetir los pasos 1–4 con viewport móvil.
   - No debe haber texto cortado, solapamientos ni desplazamiento horizontal nuevo.
   - Carrusel, menú, tarjetas y CTA deben seguir siendo utilizables.

## Efectos secundarios que comprobar

- Imágenes y recursos visuales cargan en las cuatro rutas.
- Carruseles conservan navegación y enlaces a `/casos-de-exito/{slug}`.
- Los CTA mantienen sus destinos anteriores.
- El formulario no cambia de estado por navegar o revisar el copy.
- No se crea correo, contacto, oportunidad ni evento analítico durante esta prueba sin envíos.

## Qué no debe ocurrir

- No deben aparecer métricas, CRO, revenue, ranking, ROI, “número 1”, crecimiento exponencial, 35 % ni 100–250k/mes.
- No deben presentarse atribuciones nuevas sobre responsabilidades del equipo.
- No deben cambiar textos legales, testimonios individuales, contenido fuente de WordPress, navegación, medios o formularios.
- No debe enviarse el formulario durante este QA de copy.

## Evidencia técnica realizada

Evaluada sobre `ae1e361`:

- `npm run test:public-frontend-copy`: **4/4 pruebas superadas**.
- `npx tsc --noEmit`: **superado**.
- `git diff --check origin/main...HEAD`: **superado**.
- `npm run build` con Node 24: **superado; 122/122 páginas generadas**.
- La prueba exige la forma exacta de la allowlist, rechaza los claims objetivo, comprueba props exactos en Home/Nosotros/Contacto y conserva rutas, acciones y medios representativos.
- Revisión independiente inicial: detectó el alcance indirecto de Contacto y atribuciones no acreditadas del equipo; se corrigieron en `59c9d7f` y se blindaron en `ae1e361`.

Evidencia remota:

- Rama: `https://github.com/playfulagency-dev/playful-headless/tree/codex/public-claims-frontend-v2`
- Revisión funcional: `https://github.com/playfulagency-dev/playful-headless/commit/ae1e361`

## Manifiesto de commits

1. `83bff48` — sustitución inicial del copy público.
2. `f2c59ae` — allowlist, pruebas y paquete QA inicial.
3. `ab6fba6` — metadatos técnicos fijos del índice de casos.
4. `59c9d7f` — alcance explícito en Contacto y descripciones neutrales del equipo.
5. `ae1e361` — controles por callsite y superficie Contacto.

## Riesgos conocidos

- El build muestra un aviso preexistente porque una respuesta de posts de WordPress pesa aproximadamente 4,7 MB y supera el límite de caché de 2 MB; no impidió generar las 122 páginas.
- Los datos dinámicos continúan dependiendo de la disponibilidad de WordPress; este paquete no modifica esa dependencia.
- La revisión visual responsive requiere el Preview y la aceptación de José antes de cualquier producción.
- Testimonios individuales y contenido fuente de WordPress permanecen fuera de este paquete y conservan su proceso separado de evidencia/permisos.

## Rollback

No hay migraciones ni cambios de datos. Antes de integrar, basta con no promover o eliminar la rama. Si se integrara, el rollback técnico exacto es volver a desplegar la base `a108e17` o revertir, en este orden, `ae1e361`, `59c9d7f`, `ab6fba6`, `f2c59ae` y `83bff48`. No requiere modificar WordPress.
