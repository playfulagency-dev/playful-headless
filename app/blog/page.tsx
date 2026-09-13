import { notFound } from 'next/navigation';
import { canonicalForPath } from '@/utils/canonical';
import { shouldNoindexBlogListing } from '@/utils/blog-listing-robots';
import { getBlogPosts } from '@/services/wordpress';
import Link from 'next/link';
import Image from 'next/image';
import BlogCategories from './BlogCategories';
import BlogListingPagination from './BlogListingPagination';
import NosotrosCTASection from '@/components/sections/NosotrosCTASection';
import MostViewedArticles from '@/components/blog/MostViewedArticles';
import TwoColumnCtaSection from '@/components/ui/TwoColumnCtaSection';
import { filterOpenBlogPosts } from '@/utils/blog-closed-paths';
import { blogPostPath } from '@/utils/blog-url';
import { toBlogPreview } from '@/utils/blog-preview';

// Función para formatear la fecha
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'UTC'
  };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

// Función para extraer el texto del excerpt (eliminar etiquetas HTML)
const getExcerpt = (excerpt: string) => {
  return excerpt.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...';
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Obtener el número de página, categoría y búsqueda de los parámetros
  const resolvedSearchParams = await searchParams;
  const pageRaw = resolvedSearchParams?.page;
  let currentPage = 1;
  if (pageRaw !== undefined) {
    if (typeof pageRaw !== 'string' || !/^\d+$/.test(pageRaw)) {
      notFound();
    }
    currentPage = Number.parseInt(pageRaw, 10);
    if (currentPage < 1) {
      notFound();
    }
  }
  const category = typeof resolvedSearchParams?.category === 'string' ? resolvedSearchParams.category : '';
  const searchQuery = typeof resolvedSearchParams?.search === 'string' ? resolvedSearchParams.search : '';
  const perPage = 10; // 1 destacado + 9 en el grid (3x3)

  // Obtener los posts del blog (filtrados por categoría si existe)
  const { posts: allPosts, totalPages } = await getBlogPosts(currentPage, perPage, category);
  
  // Filtrar posts por búsqueda si existe query
  let posts = filterOpenBlogPosts(allPosts);
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    posts = allPosts.filter(post => {
      const title = post.title.rendered.toLowerCase();
      const excerpt = post.excerpt?.rendered ? post.excerpt.rendered.replace(/<[^>]*>?/gm, '').toLowerCase() : '';
      return title.includes(query) || excerpt.includes(query);
    });
  }

  return (
    <div className="min-h-screen">
      <div className="w-full pt-8 pb-2">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#440099] leading-tight">
            Nuestro Blog de Playful
          </h1>
        </div>
      </div>

      {/* Mensaje de búsqueda activa */}
      {searchQuery && (
        <div className="w-full pt-8 pb-4">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#440099]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-[#440099] font-semibold">
                  Resultados de búsqueda para: <span className="font-bold">"{searchQuery}"</span>
                  {posts.length > 0 && <span className="ml-2 text-sm">({posts.length} {posts.length === 1 ? 'resultado' : 'resultados'})</span>}
                </p>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 bg-[#440099] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-[#5500BB] transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar búsqueda
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de sin resultados */}
      {searchQuery && posts.length === 0 && (
        <div className="w-full pt-8 pb-12">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="bg-white rounded-3xl p-12 text-center shadow-lg">
              <svg className="w-20 h-20 mx-auto mb-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-3xl font-bold text-[#440099] mb-4">
                No se encontraron resultados
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                No encontramos artículos que coincidan con <span className="font-bold text-[#440099]">"{searchQuery}"</span>
              </p>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 bg-[#440099] text-white px-8 py-4 rounded-full font-bold text-base hover:bg-[#5500BB] transition-all shadow-lg hover:shadow-xl"
              >
                Ver todos los artículos
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Último artículo destacado */}
      {posts.length > 0 && (
        <div className="w-full pt-4">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6 pb-12">
            <div>
              <div className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
                {/* Imagen del artículo destacado con fondo colorido */}
                <div className="h-80 md:h-96 w-full relative bg-white">
                  {posts[0].featured_media_url ? (
                    <div className="relative w-full h-full flex items-center justify-center p-8">
                      <Image
                        src={posts[0].featured_media_url}
                        alt={posts[0].featured_media_alt || posts[0].title.rendered}
                        fill
                        className="object-contain p-8"
                        sizes="(max-width: 768px) 100vw, 80vw"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-32 h-32 text-white opacity-50" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Contenido del artículo destacado */}
                <div className="p-8 md:p-10">
                  {/* Metadata superior */}
                  <div className="flex flex-wrap items-center justify-between mb-4 text-sm gap-3">
                    <div className="flex items-center gap-2 bg-[#F0E6FF] px-4 py-2 rounded-full">
                      <svg className="w-4 h-4 text-[#440099]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[#440099] font-semibold">{posts[0].author_name?.toUpperCase() || 'PLAYFUL AGENCY'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#F0E6FF] px-4 py-2 rounded-full">
                      <svg className="w-4 h-4 text-[#440099]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[#440099] font-semibold">{formatDate(posts[0].date)}</span>
                    </div>
                  </div>

                  {/* Título destacado */}
                  <Link 
                    href={blogPostPath(posts[0])}
                    className="block mb-4"
                  >
                    <h2 className="text-[1.4rem] md:text-4xl lg:text-5xl font-bold text-[#440099] hover:text-[#5500BB] transition-colors leading-tight">
                      {posts[0].title.rendered}
                    </h2>
                  </Link>
                  
                  <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    {posts[0].excerpt?.rendered ? getExcerpt(posts[0].excerpt.rendered) : ''}
                  </p>
                  
                  <Link 
                    href={blogPostPath(posts[0])}
                    className="inline-block bg-[#440099] text-white px-8 py-3 rounded-full font-bold text-base hover:bg-[#5500BB] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    LEER ARTÍCULO ›
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Artículos Más Vistos */}
      <MostViewedArticles posts={posts.map(toBlogPreview)} />

      {/* Barra de categorías */}
      <div className="w-full pb-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <BlogCategories currentCategory={category} />
        </div>
      </div>

      {/* Grid de Posts */}
      <div className="w-full pt-0 pb-0 md:pb-6">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          {posts.length <= 1 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-700">No se encontraron más artículos en esta categoría.</p>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-[#440099] mb-10">Más Artículos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-[#D2BBFF] p-10 rounded-[10px]">
                {posts.slice(1).map((post) => (
                  <article 
                    key={post.id} 
                    className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col hover:-translate-y-1"
                  >
                    {/* Imagen del artículo con fondo colorido */}
                    <div className="h-56 relative bg-white">
                      {post.featured_media_url ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={post.featured_media_url}
                            alt={post.featured_media_alt || post.title.rendered}
                            fill
                            className="object-contain p-6 hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-20 h-20 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Contenido del post */}
                    <div className="p-6 flex flex-col flex-grow">
                      {/* Categoría con badge */}
                      {post.categories && post.categories.length > 0 && (
                        <div className="mb-3">
                          <span className="inline-block bg-[#F0E6FF] text-[#440099] px-4 py-1.5 rounded-full text-xs font-bold uppercase">
                            {post.categories[0].name}
                          </span>
                        </div>
                      )}

                      {/* Título */}
                      <Link 
                        href={blogPostPath(post)}
                        className="block mb-3"
                      >
                        <h3 className="text-xl font-bold text-[#440099] line-clamp-2 leading-tight hover:text-[#5500BB] transition-colors">
                          {post.title.rendered}
                        </h3>
                      </Link>
                      
                      {/* Párrafo */}
                      <p className="text-sm text-gray-700 mb-4 flex-grow line-clamp-3 leading-relaxed">
                        {post.excerpt?.rendered ? getExcerpt(post.excerpt.rendered) : ''}
                      </p>
                      
                      {/* Fecha y botón */}
                      <div className="flex flex-col gap-3 mt-auto">
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDate(post.date)}
                        </span>
                        <Link 
                          href={blogPostPath(post)}
                          className="w-full bg-[#440099] text-white py-3 rounded-full font-bold text-sm text-center hover:bg-[#5500BB] transition-all shadow-md hover:shadow-lg"
                        >
                          LEER MÁS
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <BlogListingPagination
                currentPage={currentPage}
                totalPages={totalPages}
                category={category}
              />
            </>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-8 mb-20">
        <TwoColumnCtaSection />
      </section>
    </div>
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const noindexFollow = shouldNoindexBlogListing(resolved);

  const url = canonicalForPath('/blog');
  return {
    title: 'Blog - Playful Agency',
    description: 'Descubre las últimas noticias y consejos sobre marketing digital en nuestro blog.',
    alternates: { canonical: url },
    ...(noindexFollow ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: 'Blog - Playful Agency',
      description: 'Descubre las últimas noticias y consejos sobre marketing digital en nuestro blog.',
      url,
      images: [
        {
          url: '/images/og-blog.jpg',
          width: 1200,
          height: 630,
          alt: 'Blog - Playful Agency',
        },
      ],
    },
  };
}
