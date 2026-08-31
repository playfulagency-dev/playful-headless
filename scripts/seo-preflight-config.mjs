export const CANONICAL_ORIGIN = 'https://playfulagency.com';

export const GENERAL_ALIASES = Object.freeze([
  { source: '/servicios', destination: '/agencia-e-commerce', status: 301 },
  { source: '/services', destination: '/agencia-e-commerce', status: 301 },
  {
    source: '/contacto',
    destination: '/contactar-agencia-de-marketing-digital',
    status: 301,
  },
  {
    source: '/contactanos',
    destination: '/contactar-agencia-de-marketing-digital',
    status: 301,
  },
  {
    source: '/casos',
    destination: '/casos-de-exito-agencia-de-marketing-digital',
    status: 301,
  },
]);

// Snapshot verified against the public WordPress inventory on 2026-08-31.
// Keeping this allowlist explicit makes additions/removals visible in review.
export const BLOG_ALIASES = Object.freeze([
  {
    source: '/blog/tecnologia/los-5-problemas-de-e-commerce',
    destination: '/blog/mas-vistos/los-5-problemas-de-e-commerce',
    status: 308,
  },
  {
    source: '/blog/pautas-digitales/que-es-una-agencia-de-sem',
    destination: '/blog/mas-vistos/que-es-una-agencia-de-sem',
    status: 308,
  },
  {
    source: '/blog/tecnologia/como-elegir-el-mejor-framework-para-tu-web',
    destination: '/blog/mas-vistos/como-elegir-el-mejor-framework-para-tu-web',
    status: 308,
  },
  {
    source: '/blog/tecnologia/diseno-web-de-paginas-web',
    destination: '/blog/mas-vistos/diseno-web-de-paginas-web',
    status: 308,
  },
  {
    source: '/blog/tecnologia/rediseno-web',
    destination: '/blog/mas-vistos/rediseno-web',
    status: 308,
  },
  {
    source: '/blog/otros/marketing-deportivo-qatar-2022',
    destination: '/blog/mas-vistos/marketing-deportivo-qatar-2022',
    status: 308,
  },
  {
    source: '/blog/pautas-digitales/como-promocionar-en-black-friday-implementa-estas-estrategias',
    destination: '/blog/email-marketing/como-promocionar-en-black-friday-implementa-estas-estrategias',
    status: 308,
  },
  {
    source: '/blog/pautas-digitales/como-hacer-publicidad-en-instagram-en-el-2023',
    destination: '/blog/mas-vistos/como-hacer-publicidad-en-instagram-en-el-2023',
    status: 308,
  },
  {
    source: '/blog/otros/shakira-y-pique-un-buen-ejemplo-del-marketing-emocional',
    destination: '/blog/mas-vistos/shakira-y-pique-un-buen-ejemplo-del-marketing-emocional',
    status: 308,
  },
  {
    source: '/blog/otros/todo-lo-que-debes-saber-para-ganar-dinero-con-tiktok',
    destination: '/blog/mas-vistos/todo-lo-que-debes-saber-para-ganar-dinero-con-tiktok',
    status: 308,
  },
  {
    source: '/blog/otros/quiero-ver-mi-negocio-en-google-maps',
    destination: '/blog/mas-vistos/quiero-ver-mi-negocio-en-google-maps',
    status: 308,
  },
  {
    source: '/blog/otros/ecosistema-digital-de-tu-marca',
    destination: '/blog/mas-vistos/ecosistema-digital-de-tu-marca',
    status: 308,
  },
  {
    source: '/blog/otros/wireframe-conoce-ejemplos-tipos-y-herramientas-para-implementarlo',
    destination: '/blog/mas-vistos/wireframe-conoce-ejemplos-tipos-y-herramientas-para-implementarlo',
    status: 308,
  },
  {
    source: '/blog/pautas-digitales/cual-es-la-mejor-hora-para-publicar-en-tiktok',
    destination: '/blog/mas-vistos/cual-es-la-mejor-hora-para-publicar-en-tiktok',
    status: 308,
  },
  {
    source: '/blog/otros/bad-bunny-como-marca-la-potencia-del-marketing-musical',
    destination: '/blog/mas-vistos/bad-bunny-como-marca-la-potencia-del-marketing-musical',
    status: 308,
  },
  {
    source: '/blog/otros/messi-y-el-marketing-hablemos-sobre-su-marca-personal',
    destination: '/blog/mas-vistos/messi-y-el-marketing-hablemos-sobre-su-marca-personal',
    status: 308,
  },
  {
    source: '/blog/tecnologia/web-app-y-app-nativa-cual-es-la-mejor-opcion',
    destination: '/blog/seo/web-app-y-app-nativa-cual-es-la-mejor-opcion',
    status: 308,
  },
]);

export const ALIASES = Object.freeze([...GENERAL_ALIASES, ...BLOG_ALIASES]);

export const CANONICAL_PATHS = Object.freeze([
  '/',
  '/agencia-e-commerce',
  '/agencia-seo',
  '/agencia-sem',
  '/agencia-diseno-web',
  '/contactar-agencia-de-marketing-digital',
  '/casos-de-exito-agencia-de-marketing-digital',
  '/casos-de-exito/jumex-shopify-dtc-ecommerce',
  '/blog',
  '/blog/mas-vistos/bad-bunny-como-marca-la-potencia-del-marketing-musical',
  '/podcast',
  '/podcast/episodio-8-seo-para-e-commerce',
]);

export const ATTRIBUTION_QUERY =
  'utm_source=seo-preflight&utm_content=one&utm_content=two&gclid=a%2Bb';

export const TEST_BLOG_PATH = '/test-blog';

export const ENDPOINT_PROBE_URL =
  'https://endpoint.playfulagency.com/wp-json/wp/v2/posts?slug=bad-bunny-como-marca-la-potencia-del-marketing-musical&per_page=1&_fields=id,slug';
