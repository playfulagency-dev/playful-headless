export const WP_SERVICE_SLUGS = Object.freeze([
  'agencia-seo',
  'agencia-sem',
  'agencia-diseno-web',
  'agencia-e-commerce',
  'marketing-internacional',
  'agencia-ux-ui',
  'seo-expertos',
  'seo-vigo',
]);

export const WP_AUXILIARY_SLUGS = Object.freeze([
  'gracias',
]);

export const WP_LEGACY_SLUGS = Object.freeze([
  'miembros-de-equipo',
  'seo-internacional',
  'servicio-marketing-digital',
  'pasarela-de-pago-ecommerce',
  'pagos-online-ecommerce',
  'marketing-digital-espana',
  'landing-seo',
  'landing-page',
  'privacy-policy',
  'mercantil-servicios-financieros-internacional',
  'policlinica-metropolitana',
  'grupo-automotriz-multimarca',
  'email-marketing',
  'home',
  'home-2',
]);

export const WP_GOVERNED_SLUGS = Object.freeze([
  ...WP_SERVICE_SLUGS,
  ...WP_AUXILIARY_SLUGS,
  ...WP_LEGACY_SLUGS,
]);

export const WP_LEGACY_INDEXABLE_SLUGS_ENV = 'WP_LEGACY_INDEXABLE_SLUGS';

const SERVICE_SLUGS = new Set(WP_SERVICE_SLUGS);
const AUXILIARY_SLUGS = new Set(WP_AUXILIARY_SLUGS);
const LEGACY_SLUGS = new Set(WP_LEGACY_SLUGS);

export function parseLegacyIndexableSlugs(value = '') {
  return new Set(
    value
      .split(',')
      .map((slug) => slug.trim())
      .filter((slug) => LEGACY_SLUGS.has(slug)),
  );
}

export function getWpDynamicRoutePolicy(slug, {
  legacyIndexableSlugs = process.env[WP_LEGACY_INDEXABLE_SLUGS_ENV] ?? '',
} = {}) {
  if (SERVICE_SLUGS.has(slug)) {
    return Object.freeze({ kind: 'service', indexable: true });
  }

  if (AUXILIARY_SLUGS.has(slug)) {
    return Object.freeze({ kind: 'auxiliary', indexable: false });
  }

  if (LEGACY_SLUGS.has(slug)) {
    const indexable = parseLegacyIndexableSlugs(legacyIndexableSlugs).has(slug);
    return Object.freeze({ kind: 'legacy', indexable });
  }

  return null;
}

export function getWpDynamicRouteRobots(policy) {
  return policy?.indexable ? undefined : { index: false, follow: true };
}
