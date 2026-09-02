"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSliderSettings } from "../hooks/useSliderSettings";

// Importación dinámica del Slider para asegurar que solo se cargue en el cliente
const Slider = dynamic(() => import("react-slick").then((mod) => mod.default), {
  ssr: false,
  loading: () => <div>Cargando...</div>,
});

// Importar estilos de slick
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Estilos CSS para line-clamp
const cardStyles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-wrap: break-word;
  }
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-wrap: break-word;
    line-height: 1.25rem;
  }
  .conversion-cards-wrapper .slick-slide {
    height: auto;
  }
  .conversion-cards-wrapper .slick-slide > div {
    height: 100%;
  }
  .conversion-cards-wrapper .slick-track {
    display: flex;
    align-items: stretch;
  }
  .conversion-cards-wrapper .slick-list {
    height: 100%;
  }
`;

/**
 * Componente CarouselResultados - Muestra un slider de casos de éxito con diseño responsivo
 * @param {string} [title="Soluciones Playful: Tecnología que se traduce en ventas"] - Título principal del componente
 * @param {string} [subtitle] - Subtítulo descriptivo
 * @param {Array<Object>} [cases=[]] - Array de objetos con los casos de éxito
 * @param {string} [buttonText="¡Crece como ellos!"] - Texto del botón principal
 * @param {Function} [onButtonClick] - Función que se ejecuta al hacer clic en el botón
 * @param {string} [className] - Clases CSS adicionales para el contenedor principal
 * @param {string} [backgroundColor="#5724AB"] - Color de fondo en formato hexadecimal
 * @param {string} [textColor="white"] - Color del texto principal
 * @param {string} [buttonTextColor="white"] - Color del texto del botón principal
 * @param {string} [buttonBgColor="#39DDCB"] - Color de fondo del botón principal
 * @param {string} [cardBgColor="white"] - Color de fondo de las cards
 * @param {string} [badgeColor="#7C3AED"] - Color del badge flotante
 * @param {string} [actionButtonColor="#2563EB"] - Color del botón de acción de las cards
 */

// Interfaz para los casos de éxito de la API
interface WPCaseStudy {
  id: number;
  title: {
    rendered: string;
  };
  slug: string;
  excerpt: {
    rendered: string;
  };
  content?: {
    rendered: string;
  };
  acf: {
    tags: string[];
    badge: string;
    badge_color: string;
    button_text: string;
    button_color: string;
    imagen_destacada: string;
    categoria1?: string;
    categoria2?: string;
    categoria3?: string;
    categoria4?: string;
    categoria5?: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
  };
  featured_media_url?: string;
}

// Interfaz para los casos de estudio transformados
interface CaseStudy {
  id: number;
  title: string;
  slug: string;
  description: string;
  categories: string[];
  badge: string;
  badgeColor: string;
  buttonText: string;
  buttonColor: string;
  image: string;
}

interface CarouselResultadosProps {
  title?: string;
  title2?: string;
  subtitle?: string;
  cases?: CaseStudy[];
  casosDeExito?: any[]; // Datos crudos de la API
  buttonText?: string;
  onButtonClick?: () => void;
  className?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonTextColor?: string;
  buttonBgColor?: string;
  cardBgColor?: string;
  badgeColor?: string;
  actionButtonColor?: string;
}

// Componente para la tarjeta de caso de estudio
const CaseStudyCard = ({ caseStudy }: { caseStudy: CaseStudy }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasImage = caseStudy.image && !imageError;

  return (
    <div className="px-2 h-full">
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col h-[500px]">
        <Link href={`/casos-de-exito/${caseStudy.slug}`} className="block h-full flex flex-col">
          {/* Imagen */}
          <div className="relative h-48 bg-gray-200 overflow-hidden group flex-shrink-0">
            {hasImage ? (
              <img
                src={caseStudy.image}
                alt={caseStudy.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-gray-400">Sin imagen</span>
              </div>
            )}
            
            {/* Badge sobre la imagen */}
            {caseStudy.badge && (
              <div
                className={`absolute bottom-4 left-4 ${caseStudy.badgeColor} text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg`}
              >
                {caseStudy.badge}
              </div>
            )}
          </div>

          {/* Contenido */}
          <div className="p-6 flex-1 flex flex-col min-h-0">
            {/* Título */}
            <h3 className="text-xl font-normal text-gray-900 mb-4 leading-tight line-clamp-2 h-14 flex items-center">
              {caseStudy.title}
            </h3>

            {/* Tags - CENTRADOS VERTICALMENTE */}
            <div className="flex flex-wrap gap-2 mb-4 h-8 overflow-hidden">
              {caseStudy.categories.slice(0, 2).map((category, index) => (
                <span
                  key={index}
                  className="flex items-center px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 whitespace-nowrap"
                >
                  {category}
                </span>
              ))}
            </div>

            {/* Descripción */}
            <div className="text-gray-600 text-sm mb-6 flex-1 leading-5">
              <p className="line-clamp-3" style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.25rem'
              }}>
                {caseStudy.description || 'Descripción no disponible'}
              </p>
            </div>

            {/* Botón alineado a la derecha */}
            <div className="flex justify-end mt-auto">
              <button
                className={`${caseStudy.buttonColor} text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 shadow-md hover:shadow-lg flex-shrink-0`}
              >
                {caseStudy.buttonText}
              </button>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};


const CarouselResultados: React.FC<CarouselResultadosProps> = ({
  title = "Nuestros Clientes: La Prueba de que Sabemos de E-commerce",
  subtitle = "Nuestros clientes han logrado resultados impactantes gracias a nuestras estrategias innovadoras y personalizadas. Hemos ayudado a empresas a alcanzar sus metas y a crecer de forma exponencial.",
  title2 = "¿Quieres ser el próximo?",
  cases = [],
  casosDeExito = [],
  buttonText = "¡Crece como ellos!",
  onButtonClick,
  className = "",
  backgroundColor = "#5724AB",
  textColor = "white",
  buttonTextColor = "#2A0064",
  buttonBgColor = "#39DDCB",
  cardBgColor = "white",
  badgeColor = "#7C3AED",
  actionButtonColor = "#2563EB",
}) => {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const responsiveSettings = useSliderSettings();

  useEffect(() => {
    const fetchCaseStudies = async () => {
      try {
        let data = casosDeExito;
        
        // Solo hacer fetch si no se pasaron datos
        if (data.length === 0 && cases.length === 0) {
          const { getAllCaseStudies } = await import('@/services/wordpress');
          data = await getAllCaseStudies();
        } else if (cases.length > 0) {
          // Si se pasaron casos ya transformados, usarlos directamente
          setCaseStudies(cases);
          setLoading(false);
          return;
        } else if (data.length === 0) {
          // Si no hay datos, no hacer nada
          setLoading(false);
          return;
        }
        
        // Transformar los datos de la API al formato esperado por el componente
        const transformedData: CaseStudy[] = data.map((item: WPCaseStudy) => {
          // Extraer título
          const title = item.title?.rendered || 'Sin título';
          
          // Extraer descripción y limpiar HTML
          let description = '';
          if (item.excerpt?.rendered) {
            description = item.excerpt.rendered
              .replace(/<[^>]*>?/gm, '') // Eliminar etiquetas HTML
              .replace(/\[\/?(p|br|strong|em|h[1-6])\]/g, '') // Eliminar etiquetas cortas restantes
              .replace(/&nbsp;/g, ' ') // Reemplazar espacios no separables
              .replace(/&amp;/g, '&') // Decodificar entidades HTML
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .trim();
          }
          
          // Si no hay descripción del excerpt, usar el contenido del post
          if (!description && item.content?.rendered) {
            description = item.content.rendered
              .replace(/<[^>]*>?/gm, '')
              .replace(/\[\/?(p|br|strong|em|h[1-6])\]/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .trim();
          }
          
          // Si aún no hay descripción, usar una por defecto
          if (!description) {
            description = 'Descubre cómo este proyecto transformó los resultados de nuestro cliente con estrategias innovadoras y soluciones personalizadas.';
          }

          // Extraer imagen destacada
          let image = '';
          if (item.featured_media_url) {
            image = item.featured_media_url;
          } else if (item._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
            image = item._embedded['wp:featuredmedia'][0].source_url;
          } else if (item.acf?.imagen_destacada) {
            image = item.acf.imagen_destacada;
          }

          // Construir array de categorías
          const categories: string[] = [];
          if (item.acf?.tags) {
            categories.push(...item.acf.tags);
          }
          // Agregar categorías adicionales si existen
          for (let i = 1; i <= 5; i++) {
            const categoria = item.acf?.[`categoria${i}` as keyof typeof item.acf] as string;
            if (categoria) {
              categories.push(categoria);
            }
          }

          return {
            id: item.id,
            title,
            slug: item.slug,
            description,
            categories,
            badge: item.acf?.badge || '',
            badgeColor: item.acf?.badge_color || 'bg-purple-600',
            buttonText: item.acf?.button_text || 'Ver más',
            buttonColor: item.acf?.button_color || 'bg-blue-600',
            image,
          };
        });

        setCaseStudies(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    // Solo ejecutar una vez al montar el componente
    fetchCaseStudies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cardStyles }} />
      <div className="w-full">
        <div
          className="w-full flex flex-col gap-[25px] p-[2.2rem] lg:px-[4rem] box-border md:p-[60px_40px] lg:p-[80px_90px] rounded-3xl md:rounded-[68px] bg-[url('/images/background.webp')] text-center playful-contenedor-B3FFF3"
          style={{ backgroundColor: backgroundColor }}
        >
        {title && (
          <h2 className="playful-h2 text-center text-3xl md:text-4xl font-normal mb-4" style={{ color: textColor }}>
            {title}
          </h2>
        )}

        {subtitle && (
          <p className="playful-contenido-p text-center text-lg mb-5 max-w-3xl mx-auto" style={{ color: textColor }}>
            {subtitle}
          </p>
        )}

        {title2 && (
          <h3 className="playful-h2 pb-4" style={{ color: textColor }}>
            {title2}
          </h3>
        )}

        {/* Contenedor del carousel */}
        <div className="carousel-container overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="mt-4" style={{ color: textColor }}>Cargando casos de éxito...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-300 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : caseStudies.length > 0 ? (
            <Slider
              {...{
                ...responsiveSettings,
                slidesToScroll: 1,
                autoplay: true,
                arrows: true,
                dots: false,
              }}
              className="conversion-cards-wrapper"
            >
              {caseStudies.map((caseStudy) => (
                <div key={caseStudy.id} className="h-full">
                  <CaseStudyCard caseStudy={caseStudy} />
                </div>
              ))}
            </Slider>
          ) : (
            <div className="text-center py-12">
              <p style={{ color: textColor }}>No hay casos de éxito disponibles.</p>
            </div>
          )}
        </div>

        {onButtonClick && (
          <div className="text-center">
            <button
              className="font-semibold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105"
              onClick={onButtonClick}
              style={{
                backgroundColor: buttonBgColor,
                color: buttonTextColor,
              }}
            >
              {buttonText}
            </button>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default CarouselResultados;
