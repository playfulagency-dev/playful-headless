import { applyPublicCaseStudyOverrides } from '@/utils/public-case-study-overrides';
import { wordpressFetchCollection } from './wordpress-request.mjs';

const WORDPRESS_API_URL = 'https://endpoint.playfulagency.com/wp-json';

/** WP REST fields that Next must never serialize into RSC / client props. */
const WP_LEAK_KEYS = new Set([
  'yoast_head',
  'yoast_head_json',
  '_links',
  'link',
  'guid',
]);

const WP_ENDPOINT_HOST = 'endpoint.playfulagency.com';
const WP_ENDPOINT_URL_RE = /https?:\/\/endpoint\.playfulagency\.com[^\s"'<>]*/gi;
const WP_ENDPOINT_HOST_RE = /endpoint\.playfulagency\.com/gi;

function stripEndpointHost(value: string): string {
  return value
    .replace(WP_ENDPOINT_URL_RE, '')
    .replace(/\/\/endpoint\.playfulagency\.com[^\s"'<>]*/gi, '')
    .replace(WP_ENDPOINT_HOST_RE, '');
}
/**
 * Drop Yoast / _links / guid and any endpoint.playfulagency.com strings
 * before a WP object is passed into a Client Component (RSC payload).
 * Featured-media URLs live only on that host; they are dropped rather than
 * rewritten to a CDN that does not exist.
 */
function sanitizeWpPayload<T>(value: T): T {
  return sanitizeWpValue(value) as T;
}

function sanitizeWpValue(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeWpValue(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (WP_LEAK_KEYS.has(key) || key.toLowerCase().includes('yoast')) {
        continue;
      }
      const cleaned = sanitizeWpValue(nested);
      if (cleaned !== undefined) {
        out[key] = cleaned;
      }
    }
    return out;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase().includes('yoast')) {
      return undefined;
    }
    if (!value.includes(WP_ENDPOINT_HOST)) {
      return value;
    }
    const cleaned = stripEndpointHost(value);
    if (!cleaned.trim()) return undefined;
    return cleaned;
  }
  return value;
}

const CASE_STUDY_MEDIA_FIELDS = [
  'imagenbanner',
  'imagenminuta1',
  'imagenminuta2',
  'imagenminuta3',
  'challenge_logos',
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
  'testimonial_foto',
] as const;

function isAllowedCaseStudyMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === WP_ENDPOINT_HOST &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith('/wp-content/uploads/')
    );
  } catch {
    return false;
  }
}

function preserveCaseStudyMediaValue(value: unknown): unknown {
  if (isAllowedCaseStudyMediaUrl(value)) return value;
  if (Array.isArray(value)) {
    const media = value
      .map((item) => preserveCaseStudyMediaValue(item))
      .filter((item) => item !== undefined);
    return media.length > 0 ? media : undefined;
  }
  if (!value || typeof value !== 'object') return undefined;

  const source = value as Record<string, unknown>;
  if (!isAllowedCaseStudyMediaUrl(source.url)) return undefined;

  const media: Record<string, unknown> = { url: source.url };
  const alt = sanitizeWpValue(source.alt);
  if (typeof alt === 'string') media.alt = alt;
  if (typeof source.width === 'number' && Number.isFinite(source.width)) media.width = source.width;
  if (typeof source.height === 'number' && Number.isFinite(source.height)) media.height = source.height;
  return media;
}

function preserveCaseStudyMediaFields(acf: Record<string, unknown>): Record<string, unknown> {
  const media: Record<string, unknown> = {};
  for (const key of CASE_STUDY_MEDIA_FIELDS) {
    const preserved = preserveCaseStudyMediaValue(acf[key]);
    if (preserved !== undefined) media[key] = preserved;
  }
  return media;
}

export interface YoastMetaData {
  yoast_wpseo_title: string;
  yoast_wpseo_metadesc: string;
  yoast_wpseo_canonical?: string;
  yoast_wpseo_og_title?: string;
  yoast_wpseo_og_description?: string;
  yoast_wpseo_og_image?: string;
}

export async function getHomePageMetadata(): Promise<YoastMetaData> {
  try {
    /* console.log('Iniciando petición a WordPress...'); */
    const apiUrl = `${WORDPRESS_API_URL}/wp/v2/pages?slug=home-2&_fields=yoast_head`;
    /* console.log('URL de la API:', apiUrl); */
    
    const response = await fetch(apiUrl, { 
      next: { revalidate: 3600 },
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    /* console.log('Respuesta recibida. Status:', response.status); */
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en la respuesta:', errorText);
      throw new Error(`Error al obtener los metadatos: ${response.status} ${response.statusText}`);
    }

    const [homePage] = await response.json();
    
    if (!homePage || !homePage.yoast_head) {
      return {
        yoast_wpseo_title: 'Playful Agency',
        yoast_wpseo_metadesc: 'Agencia de marketing digital y desarrollo web',
        yoast_wpseo_canonical: '',
        yoast_wpseo_og_title: '',
        yoast_wpseo_og_description: '',
        yoast_wpseo_og_image: ''
      };
    }

    // Extraer el título
    const titleMatch = homePage.yoast_head.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'Playful Agency';
    
    // Función para extraer contenido de meta tags
    const getMetaContent = (html: string, name: string): string => {
      // Primero buscamos con comillas dobles
      let regex = new RegExp(`<meta[^>]*(?:name|property)="${name}"[^>]*content="([^"]*)"`);
      let match = html.match(regex);
      
      // Si no encontramos, buscamos con comillas simples
      if (!match) {
        regex = new RegExp(`<meta[^>]*(?:name|property)='${name}'[^>]*content='([^']*)'`);
        match = html.match(regex);
      }
      
      return match ? match[1] : '';
    };

    const metadata = {
      yoast_wpseo_title: title,
      yoast_wpseo_metadesc: getMetaContent(homePage.yoast_head, 'description'),
      yoast_wpseo_canonical: getMetaContent(homePage.yoast_head, 'canonical'),
      yoast_wpseo_og_title: getMetaContent(homePage.yoast_head, 'og:title'),
      yoast_wpseo_og_description: getMetaContent(homePage.yoast_head, 'og:description'),
      yoast_wpseo_og_image: getMetaContent(homePage.yoast_head, 'og:image'),
    };

    /* console.log('Metadatos extraídos:', JSON.stringify(metadata, null, 2)); */
    return metadata;
    
  } catch (error) {
    console.error('Error en getHomePageMetadata:', error);
    return {
      yoast_wpseo_title: 'Playful Agency',
      yoast_wpseo_metadesc: 'Agencia de marketing digital y desarrollo web',
      yoast_wpseo_canonical: '',
      yoast_wpseo_og_title: '',
      yoast_wpseo_og_description: '',
      yoast_wpseo_og_image: ''
    };
  }
}

export async function getPageMetadataBySlug(slug: string): Promise<YoastMetaData> {
  try {
    /* console.log(`Iniciando petición para obtener metadatos de la página: ${slug}`); */
    const apiUrl = `${WORDPRESS_API_URL}/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=yoast_head`;
    /* console.log('URL de la API:', apiUrl); */
    
    const response = await fetch(apiUrl, { 
      next: { revalidate: 3600 },
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    /* console.log('Respuesta recibida. Status:', response.status); */
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en la respuesta:', errorText);
      throw new Error(`Error al obtener los metadatos: ${response.status} ${response.statusText}`);
    }

    const [pageData] = await response.json();
    
    if (!pageData || !pageData.yoast_head) {
      return {
        yoast_wpseo_title: `Playful Agency - ${slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        yoast_wpseo_metadesc: 'Agencia de marketing digital y desarrollo web',
        yoast_wpseo_canonical: '',
        yoast_wpseo_og_title: '',
        yoast_wpseo_og_description: '',
        yoast_wpseo_og_image: ''
      };
    }

    // Extraer el título
    const titleMatch = pageData.yoast_head.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'Playful Agency';
    
    // Función para extraer contenido de meta tags (reutilizada de getHomePageMetadata)
    const getMetaContent = (html: string, name: string): string => {
      // Primero buscamos con comillas dobles
      let regex = new RegExp(`<meta[^>]*(?:name|property)="${name}"[^>]*content="([^"]*)"`);
      let match = html.match(regex);
      
      // Si no encontramos, buscamos con comillas simples
      if (!match) {
        regex = new RegExp(`<meta[^>]*(?:name|property)='${name}'[^>]*content='([^']*)'`);
        match = html.match(regex);
      }
      
      return match ? match[1] : '';
    };

    const metadata = {
      yoast_wpseo_title: title,
      yoast_wpseo_metadesc: getMetaContent(pageData.yoast_head, 'description'),
      yoast_wpseo_canonical: getMetaContent(pageData.yoast_head, 'canonical'),
      yoast_wpseo_og_title: getMetaContent(pageData.yoast_head, 'og:title'),
      yoast_wpseo_og_description: getMetaContent(pageData.yoast_head, 'og:description'),
      yoast_wpseo_og_image: getMetaContent(pageData.yoast_head, 'og:image'),
    };

    /* console.log(`Metadatos extraídos para ${slug}:`, JSON.stringify(metadata, null, 2)); */
    return metadata;
    
  } catch (error) {
    console.error(`Error en getPageMetadataBySlug para ${slug}:`, error);
    return {
      yoast_wpseo_title: `Playful Agency - ${slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      yoast_wpseo_metadesc: 'Agencia de marketing digital y desarrollo web',
      yoast_wpseo_canonical: '',
      yoast_wpseo_og_title: '',
      yoast_wpseo_og_description: '',
      yoast_wpseo_og_image: ''
    };
  }
}

export interface WPPage {
  id: number;
  slug: string;
  title: string;
  html: string;
  stylesheetIds: number[];
}

const IN_SITE_PAGE_HOSTS = new Set([
  'endpoint.playfulagency.com',
  'old.playfulagency.com',
  'playfulagency.com',
  'www.playfulagency.com',
]);

const WP_ASSET_PATH_PREFIXES = ['/wp-content', '/wp-includes', '/wp-json', '/wp-admin'];

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripScripts(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
}

function collectStylesheetIds(html: string, pageId: number): number[] {
  const ids = new Set<number>([pageId]);
  const re = /data-elementor-id=["'](\d+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const id = Number(match[1]);
    if (!Number.isNaN(id)) ids.add(id);
  }
  return Array.from(ids);
}

function rewritePageHref(url: string): string {
  const trimmed = url.trim();
  const parsed = trimmed.match(/^(https?:)?\/\/([^/]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i);
  if (!parsed) return url;

  const host = parsed[2].toLowerCase();
  if (!IN_SITE_PAGE_HOSTS.has(host)) return url;

  const path = parsed[3] || '/';
  if (WP_ASSET_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return url;
  }

  const query = parsed[4] || '';
  const hash = parsed[5] || '';
  const normalized = path === '/' ? '/' : path.replace(/\/+$/, '');
  return `${normalized}${query}${hash}`;
}

/** Rewrites in-site page hrefs to relative Next paths; leaves wp-content/assets untouched. */
function rewriteInSitePageHrefs(html: string): string {
  return html.replace(/href=(["'])([^"']+)\1/gi, (_full, quote: string, href: string) => {
    return `href=${quote}${rewritePageHref(href)}${quote}`;
  });
}

/** Página WP (servicios, etc.) con HTML de Elementor para renderizarla en el Next. */
export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  const { items: pages } = await wordpressFetchCollection<any>(
    `${WORDPRESS_API_URL}/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=id,slug,title,content`,
    {
      next: { revalidate: 300 },
      headers: { 'Content-Type': 'application/json' },
    },
  );
  if (!pages?.[0]) return null;
  const page = pages[0];
  const rawHtml: string = page.content?.rendered || '';
  const html = rewriteInSitePageHrefs(stripScripts(rawHtml));
  const title = stripHtml(page.title?.rendered || slug);
  const stylesheetIds = collectStylesheetIds(html, page.id);
  return { id: page.id, slug: page.slug, title, html, stylesheetIds };
}

// Interfaz para los ítems del menú
export interface MenuItem {
  title: string;
  slug: string;
  children?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  { title: 'Inicio', slug: 'home-2' },
  {
    title: 'Servicios',
    slug: 'services',
    children: [
      { title: 'Agencia E-commerce', slug: 'agencia-e-commerce' },
      { title: 'Agencia de Diseño Web', slug: 'agencia-diseno-web' },
      { title: 'Marketing Internacional', slug: 'marketing-internacional' },
      { title: 'Agencia SEO', slug: 'agencia-seo' },
      { title: 'Agencia UX/UI', slug: 'agencia-ux-ui' },
      { title: 'Agencia SEM', slug: 'agencia-sem' },
      { title: 'SEO Expertos', slug: 'seo-expertos' },
      { title: 'SEO Vigo', slug: 'seo-vigo' }
    ]
  },
  {
    title: 'Casos de Éxito',
    slug: 'casos-de-exito-agencia-de-marketing-digital',
    children: [
      { title: 'Policlínica Metropolitana', slug: 'policlinica-metropolitana' },
      { title: 'Mercantil Servicios Financieros', slug: 'mercantil-servicios-financieros-internacional' },
      { title: 'Grupo Automotriz Multimarca', slug: 'grupo-automotriz-multimarca' }
    ]
  },
  { title: 'Nosotros', slug: 'nosotros' },
  { title: 'Blog', slug: 'blog' },
  { title: 'Contacto', slug: 'contactar-agencia-de-marketing-digital' }
];

export interface WPTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface WPFeaturedMedia {
  id: number;
  source_url: string;
  alt_text?: string;
  media_details?: {
    sizes: {
      [key: string]: {
        source_url: string;
        width: number;
        height: number;
      };
    };
  };
  width?: number;
  height?: number;
}

export interface WPPost {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  content?: { rendered: string; protected?: boolean };
  excerpt?: { rendered: string; protected?: boolean };
  _embedded?: {
    'wp:featuredmedia'?: WPFeaturedMedia[];
    'wp:term'?: any[][];
    'author'?: Array<{ id: number; name: string; slug: string; avatar_urls?: { [key: string]: string } }>;
  };
  featured_media?: number;
  featured_media_url?: string;
  featured_media_alt?: string;
  categories?: any[];
  tags?: any[];
  author?: number | { id: number; name: string; slug: string; avatar_urls?: { [key: string]: string } };
  author_name?: string;
  author_avatar_urls?: { [key: string]: string };
  modified?: string;
  modified_gmt?: string;
  status?: string;
  type?: string;
  format?: string;
  sticky?: boolean;
  comment_status?: string;
  ping_status?: string;
  template?: string;
  meta?: { [key: string]: any };
}

export async function getBlogPosts(page: number = 1, perPage: number = 6, categorySlug: string = ''): Promise<{ posts: WPPost[], totalPages: number }> {
  try {
    page = Math.max(1, page);
    perPage = Math.min(100, Math.max(1, perPage));
    let url = `${WORDPRESS_API_URL}/wp/v2/posts?page=${page}&per_page=${perPage}&_embed=wp:featuredmedia,wp:term,author`;
    if (categorySlug) {
      try {
        const categoriesResponse = await fetch(
          `${WORDPRESS_API_URL}/wp/v2/categories?slug=${categorySlug}`,
          { next: { revalidate: 3600 }, headers: { 'Content-Type': 'application/json' } }
        );
        if (categoriesResponse.ok) {
          const categories = await categoriesResponse.json();
          if (categories.length > 0) url += `&categories=${categories[0].id}`;
        }
      } catch (error) {
        console.error('Error al obtener categoría:', error);
      }
    }
    const response = await fetch(url, { next: { revalidate: 60 }, headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`Error al obtener los posts: ${response.status} ${response.statusText}`);
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
    const posts: WPPost[] = await response.json();
    const processedPosts = posts.map(post => ({
      ...post,
      featured_media_url: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
      featured_media_alt: post._embedded?.['wp:featuredmedia']?.[0]?.alt_text || '',
      categories: post._embedded?.['wp:term']?.[0] || [],
      author_name: post._embedded?.['author']?.[0]?.name || 'Playful Agency'
    }));
    return { posts: processedPosts, totalPages };
  } catch (error) {
    console.error('Error en getBlogPosts:', error);
    return { posts: [], totalPages: 0 };
  }
}

export async function getLatestBlogPosts(perPage: number = 3): Promise<Array<{ id: number; title: string; excerpt: string; category: string; date: string; imageUrl: string; slug: string; href: string }>> {
  try {
    const url = new URL(`${WORDPRESS_API_URL}/wp/v2/posts`);
    url.searchParams.append('_embed', 'wp:featuredmedia,wp:term');
    url.searchParams.append('per_page', Math.min(perPage, 10).toString());
    url.searchParams.append('orderby', 'date');
    url.searchParams.append('order', 'desc');
    const response = await fetch(url.toString(), { next: { revalidate: 3600 }, headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`Error al obtener las entradas del blog: ${response.status}`);
    const posts: WPPost[] = await response.json();
    return posts.map(post => {
      let category = 'Sin categoría';
      const categories = post._embedded?.['wp:term']?.[0]?.filter(t => t.taxonomy === 'category');
      if (categories && categories.length > 0) category = categories[0].name;
      let imageUrl = '/images/blog/placeholder.jpg';
      const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
      if (featuredMedia) {
        imageUrl = featuredMedia.source_url || featuredMedia.media_details?.sizes?.full?.source_url || featuredMedia.media_details?.sizes?.large?.source_url || featuredMedia.media_details?.sizes?.medium_large?.source_url || featuredMedia.media_details?.sizes?.medium?.source_url || imageUrl;
      }
      const date = new Date(post.date);
      const formattedDate = date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').join(' / ');
      const excerpt = (post.excerpt?.rendered ?? '').replace(/<[^>]*>?/gm, '').replace(/&[a-z]+;/g, '').trim();
      const categorySlug = categories?.[0]?.slug || 'sin-categoria';
      return { id: post.id, title: post.title.rendered.replace(/&[a-z]+;/g, ''), excerpt: excerpt.length > 100 ? excerpt.substring(0, 100) + '...' : excerpt, category, date: formattedDate, imageUrl, slug: post.slug, href: `/blog/${categorySlug}/${post.slug}` };
    });
  } catch (error) {
    console.error('Error en getLatestBlogPosts:', error);
    return [];
  }
}

export async function getBlogPostBySlug(slug: string): Promise<WPPost | null> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia,wp:term,author`,
      { next: { revalidate: 60 }, headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) throw new Error(`Error al obtener el post: ${response.status} ${response.statusText}`);
    const posts: WPPost[] = await response.json();
    if (!posts || posts.length === 0) return null;
    const post = posts[0];
    if (post._embedded) {
      if (post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        const media = post._embedded['wp:featuredmedia'][0];
        post.featured_media_url = media.source_url;
        post.featured_media_alt = media.alt_text || '';
      }
      if (post._embedded['wp:term']) {
        const terms = post._embedded['wp:term'];
        post.categories = terms[0] || [];
        post.tags = terms[1] || [];
      }
      if (post._embedded['author'] && post._embedded['author'][0]) post.author = post._embedded['author'][0];
    }
    return post;
  } catch (error) {
    console.error('Error en getBlogPostBySlug:', error);
    return null;
  }
}

export interface TeamMember {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  cargo?: number[];
  rol?: number[];
  acf: {
    informacion?: { linkedin_imagen?: string; linkedin_url?: string; email?: string };
    nombre?: string;
    cargo?: string;
    cargoIds?: number[];
    habilidades: string[];
    descripcion: string;
    linkedin_url: string;
    imagen: { url: string; alt: string };
  };
  _embedded?: {
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string; taxonomy: string }>>;
    'wp:featuredmedia'?: WPFeaturedMedia[];
  };
}

export interface PodcastEpisode {
  id: number;
  date: string;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media?: number;
  featured_media_url?: string | null;
  featured_media_alt?: string;
  categoria?: number[];
  etiqueta?: number[];
  yoast_head?: string;
  yoast_head_json?: { title: string; description: string; canonical?: string; og_title?: string; og_description?: string; og_image?: Array<{ url: string; width: number; height: number }> };
  _embedded?: { 'wp:featuredmedia'?: WPFeaturedMedia[]; 'wp:term'?: WPTerm[][] };
}

export async function getPodcastPageMetadata(): Promise<YoastMetaData> {
  try {
    const apiUrl = `${WORDPRESS_API_URL}/wp/v2/pages?slug=podcast&_fields=yoast_head`;
    const response = await fetch(apiUrl, { next: { revalidate: 3600 }, headers: { 'Content-Type': 'application/json' } });
    const fallback: YoastMetaData = {
      yoast_wpseo_title: 'Podcast - Bendita Web | Playful Agency',
      yoast_wpseo_metadesc: 'Escucha nuestro podcast Bendita Web donde hablamos de marketing digital, SEO, desarrollo web y más.',
      yoast_wpseo_canonical: 'https://endpoint.playfulagency.com/podcast/',
      yoast_wpseo_og_title: 'Podcast - Bendita Web | Playful Agency',
      yoast_wpseo_og_description: 'Escucha nuestro podcast Bendita Web donde hablamos de marketing digital, SEO, desarrollo web y más.',
      yoast_wpseo_og_image: ''
    };
    if (!response.ok) return fallback;
    const [podcastPage] = await response.json();
    if (!podcastPage || !podcastPage.yoast_head) return fallback;
    const titleMatch = podcastPage.yoast_head.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : fallback.yoast_wpseo_title;
    const getMetaContent = (html: string, name: string): string => {
      let regex = new RegExp(`<meta[^>]*(?:name|property)="${name}"[^>]*content="([^"]*)"`);
      let match = html.match(regex);
      if (!match) {
        regex = new RegExp(`<meta[^>]*(?:name|property)='${name}'[^>]*content='([^']*)'`);
        match = html.match(regex);
      }
      return match ? match[1] : '';
    };
    return {
      yoast_wpseo_title: title,
      yoast_wpseo_metadesc: getMetaContent(podcastPage.yoast_head, 'description'),
      yoast_wpseo_canonical: getMetaContent(podcastPage.yoast_head, 'canonical'),
      yoast_wpseo_og_title: getMetaContent(podcastPage.yoast_head, 'og:title'),
      yoast_wpseo_og_description: getMetaContent(podcastPage.yoast_head, 'og:description'),
      yoast_wpseo_og_image: getMetaContent(podcastPage.yoast_head, 'og:image'),
    };
  } catch (error) {
    console.error('Error en getPodcastPageMetadata:', error);
    return {
      yoast_wpseo_title: 'Podcast - Bendita Web | Playful Agency',
      yoast_wpseo_metadesc: 'Escucha nuestro podcast Bendita Web donde hablamos de marketing digital, SEO, desarrollo web y más.',
      yoast_wpseo_canonical: 'https://endpoint.playfulagency.com/podcast/',
      yoast_wpseo_og_title: 'Podcast - Bendita Web | Playful Agency',
      yoast_wpseo_og_description: 'Escucha nuestro podcast Bendita Web donde hablamos de marketing digital, SEO, desarrollo web y más.',
      yoast_wpseo_og_image: ''
    };
  }
}

export async function getPodcastEpisodes(page: number = 1, perPage: number = 10): Promise<{ episodes: PodcastEpisode[], totalPages: number }> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/wp/v2/podcast?_embed=wp:featuredmedia,wp:term&per_page=${perPage}&page=${page}&_fields=id,date,slug,title,excerpt,content,featured_media,categoria,etiqueta,yoast_head,yoast_head_json,_links,_embedded`,
      { next: { revalidate: 60 }, headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) throw new Error(`Error al obtener los episodios: ${response.status} ${response.statusText}`);
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
    const episodes: PodcastEpisode[] = await response.json();
    const processedEpisodes = episodes.map(episode => {
      const featuredMedia = episode._embedded?.['wp:featuredmedia']?.[0];
      return { ...episode, featured_media_url: featuredMedia?.source_url || null, featured_media_alt: featuredMedia?.alt_text || '' };
    });
    return { episodes: processedEpisodes, totalPages };
  } catch (error) {
    console.error('Error en getPodcastEpisodes:', error);
    return { episodes: [], totalPages: 0 };
  }
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/wp/v2/equipo?_embed=wp:term,wp:featuredmedia&per_page=100`,
      { next: { revalidate: 3600 }, headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) throw new Error(`Error al obtener los miembros del equipo: ${response.status} ${response.statusText}`);
    const teamMembers = await response.json();
    const membersWithTerms = await Promise.all(teamMembers.map(async (member: any) => {
      try {
        const cargos = member._embedded?.['wp:term']?.find((t: any) => t[0]?.taxonomy === 'cargo') || [];
        const roles = member._embedded?.['wp:term']?.find((t: any) => t[0]?.taxonomy === 'rol') || [];
        const featuredMedia = member._embedded?.['wp:featuredmedia']?.[0];
        const linkedinUrl = member.acf?.informacion?.linkedin_url || member.acf?.linkedin_url || '#';
        const cargo = cargos.length > 0 ? cargos[0].name : (member.acf?.cargo || '');
        return {
          ...member,
          acf: {
            ...member.acf,
            nombre: member.title?.rendered || member.acf?.nombre || '',
            cargo: cargo,
            cargoIds: cargos.map((c: any) => c.id),
            habilidades: roles.map((r: any) => r.name) || member.acf?.habilidades || [],
            descripcion: (() => {
              const excerpt = member.excerpt?.rendered?.replace(/<[^>]*>?/gm, '').trim();
              const acfDesc = member.acf?.descripcion?.trim();
              return excerpt && excerpt !== '00' ? excerpt : (acfDesc || '');
            })(),
            linkedin_url: linkedinUrl,
            imagen: {
              url: featuredMedia?.source_url || member.acf?.imagen?.url || '/images/nosotros/placeholder-avatar.png',
              alt: featuredMedia?.alt_text || member.acf?.imagen?.alt || `Imagen de ${member.title?.rendered || 'miembro del equipo'}`
            }
          }
        };
      } catch (error) {
        console.error('Error procesando miembro del equipo:', error);
        return null;
      }
    }));
    return membersWithTerms.filter((member): member is TeamMember => member !== null);
  } catch (error) {
    console.error('Error al obtener los miembros del equipo:', error);
    return [];
  }
}

export interface ACFSuccessStory {
  categoria1: string; categoria2: string; categoria3: string; categoria4: string; categoria5: string;
  h1: string; primerap: string; imagenbanner: { url: string; alt: string } | false;
  primerh2: string; segundap: string;
  imagenminuta1: { url: string; alt: string } | false;
  imagenminuta2: { url: string; alt: string } | false;
  imagenminuta3: { url: string; alt: string } | false;
  segundoh2: string; tercerap: string; cuartap: string; quintap: string; sextap: string;
  septimap: string; octavap: string; novenap: string;
  desafioimagen1: { url: string; alt: string } | false;
  desafioimagen2: { url: string; alt: string } | false;
  desafioimagen3: { url: string; alt: string } | false;
  desafioimagen4: { url: string; alt: string } | false;
  tercerh2: string; decima: string;
  subtitle?: string; description?: string;
  hero_image?: { url: string; alt: string };
  challenge_title?: string; challenge_description?: string;
  challenge_logos?: Array<{ url: string; alt: string }>;
  work_process?: Array<{ title: string; description: string; step_items: string[]; step_image?: { url: string; alt: string } }>;
  results?: Array<{ result_value: string; result_description: string }>;
}

export interface SuccessStory extends WPPost {
  acf: ACFSuccessStory;
}

export async function getSuccessStoryBySlug(slug: string): Promise<SuccessStory | null> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/wp/v2/casos-de-exito?slug=${encodeURIComponent(slug)}&_embed&acf_format=standard`,
      { next: { revalidate: 3600 }, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } }
    );
    if (!response.ok) throw new Error(`Error al obtener el caso de éxito: ${response.status} ${response.statusText}`);
    const stories: any[] = await response.json();
    if (!stories || stories.length === 0) return null;
    const story = stories[0];
    if (!story.acf) return null;
    if (story._embedded?.['wp:featuredmedia']?.[0]) {
      story.featured_media_url = story._embedded['wp:featuredmedia'][0].source_url;
      story.featured_media_alt = story._embedded['wp:featuredmedia'][0].alt_text;
    }
    const sanitizedStory = sanitizeWpPayload(story as SuccessStory);
    sanitizedStory.acf = {
      ...sanitizedStory.acf,
      ...preserveCaseStudyMediaFields(story.acf as Record<string, unknown>),
    };
    return applyPublicCaseStudyOverrides(sanitizedStory);
  } catch (error) {
    console.error('Error en getSuccessStoryBySlug:', error);
    return null;
  }
}

export async function getPodcastEpisodeBySlug(slug: string): Promise<PodcastEpisode | null> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/wp/v2/podcast?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia,wp:term&_fields=id,date,slug,title,excerpt,content,featured_media,categoria,etiqueta,yoast_head,yoast_head_json,_links,_embedded`,
      { next: { revalidate: 60 }, headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) throw new Error(`Error al obtener el episodio: ${response.status} ${response.statusText}`);
    const episodes: PodcastEpisode[] = await response.json();
    const episode = episodes[0];
    if (!episode) return null;
    const featuredMedia = episode._embedded?.['wp:featuredmedia']?.[0];
    if (!episode.excerpt) episode.excerpt = { rendered: '' };
    return { ...episode, featured_media_url: featuredMedia?.source_url || null, featured_media_alt: featuredMedia?.alt_text || '' };
  } catch (error) {
    console.error('Error en getPodcastEpisodeBySlug:', error);
    return null;
  }
}

export async function getAllCaseStudies(): Promise<any[]> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/wp/v2/casos-de-exito?status=publish&_embed&per_page=100`,
      { next: { revalidate: 3600 }, headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) throw new Error(`Error al obtener casos de éxito: ${response.status}`);
    const casos = await response.json();
    const sanitizedCases = sanitizeWpPayload(casos);
    return sanitizedCases.map(applyPublicCaseStudyOverrides);
  } catch (error) {
    console.error('Error en getAllCaseStudies:', error);
    return [];
  }
}
