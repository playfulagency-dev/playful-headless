'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { BlogPreview } from '@/utils/blog-preview';

interface MostViewedArticlesProps {
  posts: BlogPreview[];
}

export default function MostViewedArticles({ posts }: MostViewedArticlesProps) {
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 4;
  const totalSlides = Math.ceil(posts.length / itemsPerPage);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  };

  const visiblePosts = posts.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  return (
    <div className="w-full py-12 bg-[#E9D7FF]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#440099]">Artículos Más Vistos</h2>
          <div className="flex gap-2">
            <button 
              onClick={handlePrevious}
              className="w-10 h-10 rounded-full bg-white text-[#440099] flex items-center justify-center hover:bg-[#440099] hover:text-white transition-all shadow-md"
              aria-label="Anterior"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-[#440099] text-white flex items-center justify-center hover:bg-[#5500BB] transition-all shadow-md"
              aria-label="Siguiente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {visiblePosts.map((post) => (
            <article 
              key={post.id}
              className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {/* Imagen */}
              <div className="h-48 relative bg-white">
                {post.featured_media_url ? (
                  <Image
                    src={post.featured_media_url}
                    alt={post.featured_media_alt || post.title}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Contenido */}
              <div className="p-5 flex flex-col flex-grow">
                <span className="text-xs font-bold text-[#440099] uppercase mb-3">MÁS VISTOS</span>
                
                <Link 
                  href={post.href}
                  className="block mb-3"
                >
                  <h3 className="text-lg font-bold text-[#440099] line-clamp-2 leading-tight hover:text-[#5500BB] transition-colors">
                    {post.title}
                  </h3>
                </Link>
                
                <p className="text-xs text-gray-500 mb-4">
                  {formatDate(post.date)}
                </p>
                
                <Link 
                  href={post.href}
                  className="mt-auto w-full bg-[#440099] text-white py-3 rounded-full font-bold text-sm text-center hover:bg-[#5500BB] transition-all"
                >
                  LEER MÁS
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Indicadores de página */}
        {totalSlides > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-8 bg-[#440099]' 
                    : 'w-2 bg-[#440099] opacity-30'
                }`}
                aria-label={`Ir a la página ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
