const ALLOWED_MEDIA_FIELDS = new Set([
  'imagenbanner',
  'imagenminuta1',
  'imagenminuta2',
  'imagenminuta3',
  'imagenminuta4',
  'imagenminuta5',
  'imagenminuta6',
  'desafioimagen1',
  'desafioimagen2',
  'desafioimagen3',
  'desafioimagen4',
  'imagendesarrollo',
  'grilla1',
  'grilla2',
  'grilla3',
  'grilla4',
  'grilla5',
  'grilla6',
  'grilla7',
  'grilla8',
  'telefono1',
  'telefono2',
  'telefono3',
  'telefono4',
  'telefonos',
]);

function sameValue(actual, expected) {
  if (Object.is(actual, expected)) return true;
  if (typeof actual !== typeof expected || actual === null || expected === null) return false;

  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) {
      return false;
    }
    return actual.every((item, index) => sameValue(item, expected[index]));
  }

  if (typeof actual !== 'object') return false;

  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (!sameValue(actualKeys, expectedKeys)) return false;
  return actualKeys.every((key) => sameValue(actual[key], expected[key]));
}

export function auditPublicCaseStudySource(record, slug, expected) {
  const mismatches = [];

  if (record.slug !== slug) mismatches.push('slug');
  if (record.title?.rendered !== expected.title) mismatches.push('title.rendered');

  const expectedContent = `<p>${expected.summary}</p>`;
  if (record.content?.rendered?.trim() !== expectedContent) mismatches.push('content.rendered');

  for (const [key, expectedValue] of Object.entries(expected.acf)) {
    if (!sameValue(record.acf?.[key], expectedValue)) mismatches.push(`acf.${key}`);
  }

  const expectedFields = new Set(Object.keys(expected.acf));
  for (const key of Object.keys(record.acf ?? {})) {
    if (!expectedFields.has(key) && !ALLOWED_MEDIA_FIELDS.has(key)) {
      mismatches.push(`acf.unexpected:${key}`);
    }
  }

  return Array.from(new Set(mismatches)).sort();
}
