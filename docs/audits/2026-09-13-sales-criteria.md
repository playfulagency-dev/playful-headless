# Matriz interna de criterios comerciales — card 86cbh2p37

Fecha: 13-09-2026. Responsable: agente Ventas; revisión independiente por el coordinador completada el 13/09/2026.
Entregable: contraste documental de rol, canal, facturación y plazo. No modifica copy, scoring, CRM ni producción.
Hipótesis: el recorrido admite comercios físicos en Shopify pero restringe la reserva acelerada a facturación online; esa diferencia puede excluir prospectos pertinentes.
KPI de esta auditoría: 4/4 dimensiones contrastadas en las tres superficies, con evidencia y límites explícitos. No se afirma impacto sobre conversión sin datos.
Criterio de cierre: matriz revisada independientemente y conclusiones registradas en la card; no exige resolver una política comercial nueva para cerrar este análisis.

## Evidencia consultada

GET de HTML público, sin envíos ni contactos, realizado hoy:
- https://playfulagency.com/agencia-shopify
- https://playfulagency.com/contactar-agencia-de-marketing-digital
- https://playfulagency.com/gracias?conv=Lead

Capturas textuales locales: `/private/tmp/playful-shopify-observed.html`, `/private/tmp/playful-form-observed.html`, `/private/tmp/playful-thanks-observed.html`. Son HTML público, no datos de prospectos.
Se excluye como autoridad de producción el checkout local antiguo: difiere del formulario público, por ejemplo en el selector telefónico.

## Revisión independiente

PASS documental: el coordinador contrastó de nuevo las tres URLs públicas; confirmó ventas físicas en Shopify, opciones de marketplaces y facturación online en formulario, umbral online y continuidad de revisión en gracias. El cierre corresponde al análisis, no a una modificación de política comercial ni a validar el backend.

## Matriz de lo observado

| Dimensión | Shopify público | Formulario público | Gracias público | Contraste |
|---|---|---|---|---|
| Rol | En los pasajes de cualificación examinados no explicita cargo decisor. | Selector obligatorio: dueño/socio/cofundador; líder de e-commerce/marketing/operaciones que participa en decisión; investigador para otro equipo; Otro. | Dueño, socio o responsable que participa en decisión. | Formulario captura tanto decisores como investigadores; gracias invita a reserva a decisores. No es una contradicción por sí sola. |
| Canal | Admite canal propio, marketplaces, Instagram/WhatsApp, venta fuera de línea; expresamente un comercio físico que nunca vendió online. | Selector obligatorio: D2C; D2C+B2B; Amazon; Mercado Libre; otros marketplaces; marketplace→D2C; primera venta D2C; no D2C/no seguro; Otro. | D2C, o Amazon/Mercado Libre buscando canal directo. | Tienda física no tiene opción específica; puede usar primera venta u Otro. Otros marketplaces y D2C+B2B no se nombran expresamente en gracias, aunque pueden encajar. |
| Facturación | No fija umbral en los pasajes de cualificación; acepta gran comercio con ventas físicas sin ventas online. | «Facturación mensual online aproximada», obligatorio: >US$100.000; US$50.000–100.000; US$10.000–50.000; <US$10.000; prefiero no compartirlo; Otro. | «Más de US$100.000 al mes en ventas online». | Diferencia comercial concreta: un comercio físico grande con cero online entra en Shopify pero no cumple reserva acelerada. No puede inferirse que sea un error de scoring. |
| Plazo/intención | Invita a evaluar alcance y migración; los pasajes examinados no imponen plazo máximo. | Obligatorio: próximos 30 días; próximos 1–3 meses; evaluando opciones; solo investigando; Otro. | Necesidad concreta, inicio en próximos tres meses y disposición a evaluar inversión. | Recoge estados menos maduros sin darles automáticamente encaje para reserva. Coincide con intención de precalificación. |

## Decisiones expresas de José en este hilo

- Buyer prioritario: dueños o responsables de e-commerce D2C con facturación superior a 100k mensuales e interés real de proyecto.
- Campos de cualificación predefinidos obligatorios, opción Otro con aclaración y texto final libre.
- Incluir Amazon/Mercado Libre y comerciantes que buscan dar el salto del marketplace a venta directa.
- Rangos de facturación denominados en US$ y etiqueta «mensual online» proporcionados por José.
- Gracias aprobado con requisitos para acelerar reserva y sesión gratuita de finalidad comercial, sin compromiso de contratación.
- No consta aquí una decisión expresa de extender ese umbral a facturación física o total. La publicación de Shopify prueba el texto actual, no una autorización para reinterpretar el scoring.

## Conclusión operativa

Se confirma una diferencia de elegibilidad entre la landing Shopify amplia y la vía acelerada de gracias estricta. No se demuestra pérdida de leads: gracias dice que revisaremos la solicitud aunque no se reserve. No se ha probado una exclusión técnica, ausencia de registro ni clasificación CRM errónea.

La captura obligatoria de respuestas por debajo del umbral, investigadores o «prefiero no compartirlo» no es por sí sola un fallo: permite registrar y revisar perfiles sin concederles prioridad automática. No procede bloquearlos ni alterar CRM basándose solo en este contraste.

La alineación de rol y plazo es suficiente en lo inspeccionado. El hueco prioritario de política es si comercios físicos consolidados deben tener acceso a reserva acelerada aunque no alcancen >US$100k online. El texto de Shopify y el umbral online no deben armonizarse automáticamente suponiendo que son equivalentes.

## Acción que puede cerrarse sin aprobación de José

Completar esta matriz con revisión independiente y enlazarla en la card. Mantener reglas actuales. Si existe ya una card de unificación editorial, agregar allí esta evidencia sin crear una macrocard ni duplicar trabajo.

## Cambio futuro que sí requiere decisión comercial

Solo si se decide implementar una ampliación: confirmar si el comercio físico consolidado es una excepción comercial o un nuevo segmento elegible, y qué magnitud de facturación se utilizaría. Hasta entonces no cambiar el umbral online por ventas totales, ni dar por cualificado automáticamente al segmento marketplace, ni prometer acceso indiscriminado a agenda.

## Límites

No se accedió a registros privados de HighLevel, GA4 ni GSC. No hubo POST, reserva, correo o cambio de permisos. La obligatoriedad reportada se observa en atributos HTML `required`; no sustituye una prueba interactiva o validación del servidor. No se afirma verificada la lógica dinámica de «Otro» ni el mapeo CRM. Los efectos comerciales son hipótesis, no resultados medidos.

