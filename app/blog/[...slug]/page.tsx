import { getBlogPostBySlug, getBlogPosts, type WPPost } from '@/services/wordpress';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { canonicalForPath } from '@/utils/canonical';
import { blogPostPath, getPrimaryCategorySlug } from '@/utils/blog-url';
import {
  getBlogServiceCta,
  linkFirstUnlinkedServiceMention,
} from '@/utils/blog-service-cta';
import * as cheerio from 'cheerio';
import TableOfContents from '@/components/blog/TableOfContents';
import { BlogPostContent } from './BlogPostContent';
import BlogRelatedPostsSection from '@/components/sections/BlogRelatedPostsSection';
import NosotrosCTASection from '@/components/sections/NosotrosCTASection';
import TwoColumnCtaSection from '@/components/ui/TwoColumnCtaSection';

export async function generateStaticParams() {
  // getBlogPosts already drops José v2 closed paths, so they are not SSG'd.
  const { posts } = await getBlogPosts(1, 100);
  return posts.map((post) => ({
    slug: [getPrimaryCategorySlug(post), post.slug],
  }));
}

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'UTC'
  };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

interface BlogPostPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  // El array slug contiene [category, post-slug]
  const { slug } = await params;
  if (slug.length !== 2) {
    notFound();
  }

  const [category, postSlug] = slug;
  
  if (!postSlug) {
    notFound();
  }

  const post = await getBlogPostBySlug(postSlug);
  
  if (!post) {
    notFound();
  }

  const postCategory = getPrimaryCategorySlug(post);

  if (postCategory !== category) {
    // Known WordPress category aliases redirect in middleware (one hop,
    // including AMP junk). Unknown categories stay 404 so attribution
    // query params are not silently dropped.
    notFound();
  }

  // Extraer encabezados para la tabla de contenidos
  const $ = cheerio.load(post.content?.rendered || '');
  const headings = $('h2, h3, h4')
    .map((_, el) => {
      const $el = $(el);
      let id = $el.attr('id') || '';
      const text = $el.text();
      
      // Si no tiene ID, generar uno y agregarlo al elemento
      if (!id) {
        id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        $el.attr('id', id);
      }
      
      return {
        text,
        slug: id
      };
    })
    .get() as Array<{ text: string; slug: string }>;

  const serviceCta = getBlogServiceCta(postSlug);
  if (serviceCta) {
    linkFirstUnlinkedServiceMention($, serviceCta);
  }

  // Actualizar el contenido con los IDs agregados
  const contentWithIds = $.html();

  return (
    <>
    <h1 className="sr-only">{post.title.rendered}</h1>
    {serviceCta ? (
      <p data-playful-service-cta="" className="sr-only">
        <a href={serviceCta.href}>{serviceCta.label}</a>
      </p>
    ) : null}
    <BlogPostContent>
      <div className="min-h-screen">
      {/* Header con título e imagen */}
      <header className="pt-4 pb-12">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 bg-white rounded-[18px] p-[60px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Columna izquierda: Título y resumen */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-sm text-gray-500">{formatDate(post.date)}</span>
                {post.categories && post.categories.length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <Link 
                      href={`/blog?category=${post.categories[0].slug}`}
                      className="text-sm font-medium text-[#440099] hover:text-[#5500BB] transition-colors uppercase"
                    >
                      {post.categories[0].name}
                    </Link>
                  </>
                )}
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#2A0064] leading-tight mb-6">
                {post.title.rendered}
              </h2>
              
              {post.excerpt?.rendered && (
                <div 
                  className="text-lg text-gray-700 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ 
                    __html: post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' 
                  }} 
                />
              )}

              {/* Badge de Autor */}
              {post.author && typeof post.author === 'object' && (
                <div className="inline-flex items-center gap-2 bg-[#440099] text-white px-4 py-2 rounded-full">
                  {post.author.avatar_urls && post.author.avatar_urls['48'] && (
                    <img 
                      src={post.author.avatar_urls['48']} 
                      alt={post.author.name}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium">{post.author.name}</span>
                </div>
              )}
            </div>

            {/* Columna derecha: Imagen destacada */}
            {post.featured_media_url && (
              <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-[#DFFFFE] to-[#E0F7FA]">
                <Image
                  src={post.featured_media_url}
                  alt={post.featured_media_alt || post.title.rendered}
                  fill
                  className="object-contain p-8"
                  priority
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Categorías y Compartir - Debajo del Hero */}
      <section className="mx-auto max-w-[1200px] px-4 md:px-6 py-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Categorías a la izquierda */}
          <div className="flex flex-wrap items-center gap-2">
            {post.categories && post.categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog?category=${cat.slug}`}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[#440099] text-white hover:bg-[#5500BB] transition-all"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Compartir a la derecha */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm text-gray-600 font-medium hidden sm:inline">compartelo:</span>
            
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
              aria-label="Compartir en WhatsApp"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-all"
              aria-label="Compartir en LinkedIn"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all"
              aria-label="Compartir en Facebook"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* Twitter/X */}
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#000000] hover:bg-[#000000] hover:text-white transition-all"
              aria-label="Compartir en X (Twitter)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>

            {/* Email */}
            <a
              href={`mailto:?subject=Te comparto este artículo&body=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#EA4335] hover:bg-[#EA4335] hover:text-white transition-all"
              aria-label="Compartir por Email"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="detalle-blog-fondo max-w-[1200px] mx-auto px-4 md:px-6 py-12">
        <article className="bg-white rounded-[36px] p-8 md:p-12">
          
          {/* Table of Contents - Antes del contenido */}
          {headings.length > 0 && (
            <div className="mb-12 max-w-[800px] mx-auto">
              <TableOfContents items={headings.map(h => ({
                text: h.text,
                slug: `#${h.slug}`
              }))} />
            </div>
          )}
          
          <div 
            className="prose prose-lg max-w-none prose-headings:text-[#2A0064] prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-[#440099] prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
            dangerouslySetInnerHTML={{ __html: contentWithIds }} 
          />

          {serviceCta ? (
            <p className="mt-8">
              <a
                href={serviceCta.href}
                className="font-medium text-[#440099] hover:underline"
              >
                {serviceCta.label}
              </a>
            </p>
          ) : null}
          
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Etiquetas
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/blog?tag=${tag.slug}`}
                    className="px-4 py-2 bg-[#F5F3FF] text-[#440099] rounded-full text-sm font-medium hover:bg-[#EDE9FE] transition-colors"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      
      {/* Sección de artículos relacionados */}
      <div className="mt-16">
        <BlogRelatedPostsSection />
      </div>
      
      {/* Sección CTA */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-16 mb-20">
        <TwoColumnCtaSection />
      </section>
      </div>
    </BlogPostContent>
    </>
  );
}

const BLOG_SEO_OVERRIDES: Record<string, { title?: string; description: string }> = {
  'actualizar-tu-e-commerce': {
    description: 'Si tu tienda ya vende y se quedó corta, actualizar el e-commerce no es empezar de cero. Es mejorar la experiencia, la gestión y el pedido que ya tienes.',
  },
  'cintillos-de-promocion': {
    title: 'Cintillos de promoción en ecommerce | Playful',
    description: 'Los cintillos de promoción en ecommerce anuncian ofertas y retienen la mirada en la tienda. Cómo diseñarlos con criterio, no como un truco de checkout.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const [, postSlug] = slug;
  
  if (slug.length !== 2 || !postSlug) {
    return {
      title: 'Artículo no encontrado',
      robots: { index: false, follow: false },
    };
  }

  const post = await getBlogPostBySlug(postSlug);
  
  if (!post) {
    return {
      title: 'Artículo no encontrado',
      robots: { index: false, follow: false },
    };
  }

  const url = canonicalForPath(blogPostPath(post));

  const override = BLOG_SEO_OVERRIDES[postSlug];
  const title = override?.title ?? `${post.title.rendered} | Blog - Playful Agency`;
  const description = override?.description ?? (post.excerpt?.rendered ? post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 160) : '');

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      publishedTime: post.date,
      authors: [post.author_name || 'Playful Agency'],
      images: [
        {
          url: post.featured_media_url || '/images/og-blog.jpg',
          width: 1200,
          height: 630,
          alt: post.featured_media_alt || post.title.rendered,
        },
      ],
    },
  };
}
