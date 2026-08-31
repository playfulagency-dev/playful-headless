import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const copyPath = path.join(repositoryRoot, 'utils/public-frontend-copy.json');
const publicFrontendCopy = JSON.parse(await readFile(copyPath, 'utf8'));

const scopedSourceFiles = [
  'app/page.tsx',
  'app/layout.tsx',
  'components/MaterialServicesSection.tsx',
  'components/SolucionesPlayful.tsx',
  'app/nosotros/page.tsx',
  'components/CarouselResultados.tsx',
  'app/casos-de-exito-agencia-de-marketing-digital/CaseStudiesContent.tsx',
  'app/casos-de-exito-agencia-de-marketing-digital/TestimonialsSection.tsx',
  'app/casos-de-exito-agencia-de-marketing-digital/page.tsx',
];

const forbiddenClaimPatterns = [
  /35\s*%/,
  /100[.\s]?000/,
  /100\s*[–-]\s*250\s*k/,
  /perdiendo dinero/,
  /dejando dinero sobre la mesa/,
  /maquinas de conversion/,
  /ventas consistentes/,
  /crecimiento real/,
  /matando tus conversiones/,
  /oportunidad de venta perdida/,
  /afectando directamente tu tasa de conversion/,
  /convierten visitantes en clientes/,
  /proceso de pago se siente natural e inevitable/,
  /altamente visible para los motores de busqueda/,
  /trafico cualificado/,
  /empezar a dominar/,
  /competir y crecer/,
  /mejorar las tasas de conversion/,
  /retorno de la inversion/,
  /ayudarte a crecer/,
  /numero 1/,
  /miles de emprendedores/,
  /motor de crecimiento/,
  /mejores soluciones digitales/,
  /resultados impactantes/,
  /crecer de forma exponencial/,
  /transformo los resultados/,
  /estrategias innovadoras/,
  /resultados que hablan por si solos/,
  /impulsen tu crecimiento/,
  /alcanzar sus metas/,
  /empezar a vender mas/,
  /trabajo enfocado en resultados reales/,
  /\brevenue\b/,
  /\branking\b/,
  /\broi\b/,
];

// The existing media filename `generamos-exito-roi.png` is not rendered copy and
// must remain unchanged. ROI is still forbidden in every allowlisted public string.
const forbiddenSourceClaimPatterns = forbiddenClaimPatterns.filter(
  (pattern) => pattern.source !== '\\broi\\b',
);

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function collectStrings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings);
  return [];
}

test('the frontend copy allowlist has the exact approved surface shape', () => {
  assert.deepEqual(Object.keys(publicFrontendCopy), [
    'home',
    'about',
    'caseStudiesCarousel',
    'caseStudiesIndex',
  ]);

  assert.deepEqual(Object.keys(publicFrontendCopy.home), [
    'metadataDescription',
    'heroTitle',
    'heroParagraphs',
    'technicalReviewTitle',
    'technicalReviewIntro',
    'technicalReviewCards',
    'solutionsTitle',
    'solutionsIntro',
    'solutionCards',
    'cta',
  ]);
  assert.equal(publicFrontendCopy.home.heroParagraphs.length, 2);
  assert.equal(publicFrontendCopy.home.technicalReviewCards.length, 3);
  assert.equal(publicFrontendCopy.home.solutionCards.length, 3);
  assert.deepEqual(Object.keys(publicFrontendCopy.about), [
    'history',
    'capabilities',
    'platforms',
    'vision',
    'teamIntro',
    'teamDescriptions',
    'cta',
  ]);
  assert.deepEqual(Object.keys(publicFrontendCopy.about.teamDescriptions), [
    '86224',
    '86226',
    '86227',
    '86228',
    '86229',
    '86475',
    'default',
  ]);
  assert.deepEqual(Object.keys(publicFrontendCopy.caseStudiesCarousel), [
    'title',
    'subtitle',
    'title2',
    'buttonText',
    'fallbackDescription',
  ]);
  assert.deepEqual(Object.keys(publicFrontendCopy.caseStudiesIndex), [
    'title',
    'intro',
    'sectionTitle',
    'sectionDescription',
    'metadataTitle',
    'metadataDescription',
    'testimonialsIntro',
    'cta',
  ]);
});

test('allowlisted copy describes only the approved technical capabilities', () => {
  const copy = collectStrings(publicFrontendCopy).join('\n');
  const normalizedCopy = normalize(copy);

  for (const capability of [
    'diseño',
    'desarrollo',
    'Shopify',
    'WooCommerce',
    'headless',
    'funcionalidades',
    'integraciones',
  ]) {
    assert.match(normalizedCopy, new RegExp(normalize(capability)), `missing ${capability}`);
  }

  for (const pattern of forbiddenClaimPatterns) {
    assert.doesNotMatch(normalizedCopy, pattern, `forbidden public claim: ${pattern}`);
  }
});

test('targeted claims cannot reappear in the scoped frontend sources', async () => {
  const sourceEntries = await Promise.all(
    scopedSourceFiles.map(async (file) => [
      file,
      normalize(await readFile(path.join(repositoryRoot, file), 'utf8')),
    ]),
  );

  for (const [file, source] of sourceEntries) {
    for (const pattern of forbiddenSourceClaimPatterns) {
      assert.doesNotMatch(source, pattern, `${file} contains forbidden public claim ${pattern}`);
    }
  }
});

test('routes, CTA actions and media anchors remain unchanged', async () => {
  const home = await readFile(path.join(repositoryRoot, 'app/page.tsx'), 'utf8');
  const about = await readFile(path.join(repositoryRoot, 'app/nosotros/page.tsx'), 'utf8');
  const index = await readFile(
    path.join(repositoryRoot, 'app/casos-de-exito-agencia-de-marketing-digital/CaseStudiesContent.tsx'),
    'utf8',
  );
  const indexPage = await readFile(
    path.join(repositoryRoot, 'app/casos-de-exito-agencia-de-marketing-digital/page.tsx'),
    'utf8',
  );
  const carousel = await readFile(
    path.join(repositoryRoot, 'components/CarouselResultados.tsx'),
    'utf8',
  );

  assert.match(home, /href="\/contactar-agencia-de-marketing-digital"/);
  assert.match(home, /src="\.\.\/images\/playful-imagen-banner\.png"/);
  assert.match(home, /imageUrl="\/images\/imagen-nueva-cta-home\.png"/);
  assert.match(about, /src="\/images\/nosotros-playful-imagen\.png"/);
  assert.match(about, /<CarouselResultados casosDeExito=\{casosDeExito\}/);
  assert.match(index, /src="\/images\/casos-de-exito\.png"/);
  assert.match(index, /https:\/\/endpoint\.playfulagency\.com\/wp-json\/wp\/v2\/casos-de-exito\?_embed/);
  assert.match(indexPage, /const title = publicFrontendCopy\.caseStudiesIndex\.metadataTitle/);
  assert.match(indexPage, /const description = publicFrontendCopy\.caseStudiesIndex\.metadataDescription/);
  assert.doesNotMatch(indexPage, /yoast_wpseo_(?:title|metadesc|og_title|og_description)/);
  assert.match(carousel, /href=\{`\/casos-de-exito\/\$\{caseStudy\.slug\}`\}/);
});
