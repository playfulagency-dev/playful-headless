# QA de copy técnico en superficies públicas

## Alcance

Este paquete sustituye afirmaciones comerciales no sustentadas por descripciones técnicas en Home, Nosotros, el carrusel compartido y el índice de proyectos. La fuente de verdad del nuevo copy es `utils/public-frontend-copy.json`.

No modifica WordPress, casos dinámicos, testimonios, navegación, destinos de CTA, formularios ni recursos visuales. Los textos dinámicos de WordPress y sus permisos de publicación requieren una revisión separada de fuente y evidencia.

## Control automatizado

```sh
npm run test:public-frontend-copy
npx tsc --noEmit
npm run build
git diff --check origin/main...HEAD
```

La prueba comprueba la forma cerrada de la allowlist, exige las capacidades técnicas aprobadas, rechaza los claims retirados y conserva rutas, acciones de CTA y recursos visuales representativos.

## Borrador de paquete para QA José

### Qué cambió y por qué

Se retiraron promesas de ingresos, conversión, ranking, ROI y crecimiento de cuatro superficies públicas. El nuevo texto describe diseño y desarrollo de ecommerce, Shopify, WooCommerce, arquitectura headless, funcionalidades e integraciones sin atribuir resultados comerciales. Las descripciones públicas del equipo usan una allowlist exacta por ID y un fallback neutral para no renderizar claims dinámicos de WordPress.

### Entorno

- URL: añadir la URL exacta del Preview del commit evaluado.
- Navegador: Chrome en escritorio a 1440 px y móvil a aproximadamente 390 px.
- Datos de prueba: no se necesitan. No enviar formularios.

### Pasos y resultado esperado

1. Abrir la Home. El hero y los bloques técnicos deben describir arquitectura, interfaz, Shopify/WooCommerce, headless, funcionalidades e integraciones; el CTA debe conservar su destino.
2. Abrir `/nosotros`. Historia, capacidades, visión y presentación del equipo deben usar lenguaje técnico; no debe aparecer el 35 %, facturación, ROI, liderazgo absoluto ni promesas de crecimiento.
3. Revisar el carrusel en Home y Nosotros. El título, subtítulo y fallback deben presentar proyectos y alcance técnico, sin prometer resultados.
4. Abrir `/casos-de-exito-agencia-de-marketing-digital`. El hero, introducción, metadatos de fallback y CTA deben conservar layout y navegación con el nuevo copy técnico.
5. Repetir los pasos 1–4 en móvil. No debe haber texto cortado, solapamientos ni desplazamiento horizontal.

### Efectos secundarios que comprobar

- Las imágenes, tarjetas, filtros y carruseles siguen cargando.
- Los CTA mantienen sus destinos anteriores.
- Las fichas de Jumex y Odwalla mantienen el contenido técnico aprobado.
- No se crea correo, contacto, oportunidad ni evento analítico por esta revisión de navegación.

### Qué no debe ocurrir

- No deben reaparecer métricas, CRO, revenue, rankings, ROI, “número 1”, crecimiento exponencial ni el umbral 100–250k/mes.
- No deben cambiar textos legales, testimonios, formularios o contenido de WordPress.
- No debe enviarse el formulario durante esta prueba.

### Evidencia y rollback

Antes de pasar a `qa:listo-para-probar`, añadir aquí el commit, el Preview exacto, el resultado de pruebas/build, la revisión independiente y capturas representativas. El rollback consiste en revertir únicamente los commits de este paquete o promover el commit base documentado; no requiere modificar WordPress ni datos.
