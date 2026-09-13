// Only public identity verified against the production header/footer.
// Social links disagree between components, so sameAs is intentionally omitted.
export const ORGANIZATION_SCHEMA = Object.freeze({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://playfulagency.com/#organization',
  name: 'Playful Agency',
  url: 'https://playfulagency.com/',
  logo: 'https://playfulagency.com/images/logos/playful-logov.svg',
});

export const ORGANIZATION_JSON_LD = JSON.stringify(ORGANIZATION_SCHEMA)
  .replace(/</g, '\\u003c');
