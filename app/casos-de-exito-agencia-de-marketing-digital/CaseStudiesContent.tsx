"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import TwoColumnCtaSection from "@/components/ui/TwoColumnCtaSection";
import BlogRelatedPostsSection from "@/components/sections/BlogRelatedPostsSection";
import { applyPublicCaseStudyOverrides } from "@/utils/public-case-study-overrides";
import publicFrontendCopy from "@/utils/public-frontend-copy.json";

// Importación dinámica para evitar problemas de hidratación
const TestimonialsSection = dynamic(() => import("./TestimonialsSection"), {
  ssr: false,
});

// Interfaz para los casos de estudio transformados
export interface CaseStudy {
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

// Componente para la tarjeta de caso de estudio
const CaseStudyCard = ({ caseStudy }: { caseStudy: CaseStudy }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasImage = caseStudy.image && !imageError;

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
      <Link href={`/casos-de-exito/${caseStudy.slug}`} className="block h-full">
        {/* Imagen */}
        <div className="relative h-56 bg-gray-200 overflow-hidden group">
          {hasImage ? (
            <img
              src={caseStudy.image}
              alt={caseStudy.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
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
        <div className="p-6 flex-1 flex flex-col">
          {/* Título */}
          <h3 className="text-xl font-normal text-gray-900 mb-4 leading-tight">
            {caseStudy.title}
          </h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {caseStudy.categories.map((category, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700"
              >
                {category}
              </span>
            ))}
          </div>

          {/* Descripción */}
          <p className="text-gray-600 text-sm mb-6 flex-1 leading-relaxed">
            {caseStudy.description}
          </p>

          {/* Botón alineado a la derecha */}
          <div className="flex justify-end">
            <button
              className={`${caseStudy.buttonColor} text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 shadow-md hover:shadow-lg`}
            >
              {caseStudy.buttonText}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default function CaseStudiesContent() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State para filtros
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    const fetchCaseStudies = async () => {
      try {
        const response = await fetch(
          "https://endpoint.playfulagency.com/wp-json/wp/v2/casos-de-exito?_embed"
        );
        if (!response.ok) {
          throw new Error("Error al cargar los casos de éxito");
        }
        const data = (await response.json()).map(applyPublicCaseStudyOverrides);

        const transformedData: CaseStudy[] = data.map((item: any) => {
          const title = item.title?.rendered || "Sin título";

          let description = "";
          if (item.excerpt?.rendered) {
            description = item.excerpt.rendered
              .replace(/<[^>]*>?/gm, "")
              .replace(/\[\/?(p|br|strong|em|h[1-6])\]/g, "")
              .trim();
          } else if (item.content?.rendered) {
            description =
              item.content.rendered.replace(/<[^>]*>?/gm, "").substring(0, 200) +
              "...";
          }

          let image = "";
          if (item._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
            image = item._embedded["wp:featuredmedia"][0].source_url;
          } else if (item.featured_media_url) {
            image = item.featured_media_url;
          }

          const categories = [
            item.acf?.categoria1,
            item.acf?.categoria2,
            item.acf?.categoria3,
            item.acf?.categoria4,
            item.acf?.categoria5,
          ].filter(Boolean) as string[];

          return {
            id: item.id,
            title,
            slug: item.slug || `caso-${item.id}`,
            description: description || "Descripción no disponible",
            categories,
            badge: item.acf?.badge || item.meta?._case_study_badge || "",
            badgeColor:
              item.acf?.badge_color ||
              item.meta?._case_study_badge_color ||
              "bg-purple-600",
            buttonText: item.acf?.button_text || "Ver más",
            buttonColor:
              item.acf?.button_color || "bg-blue-600 hover:bg-blue-700",
            image,
          };
        });

        setCaseStudies(transformedData);
      } catch (err) {
        console.error("Error fetching case studies:", err);
        setError(
          "No se pudieron cargar los casos de estudio. Por favor, intente nuevamente más tarde."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCaseStudies();
  }, []);

  // All available categories
  const allCategories = Array.from(
    new Set(caseStudies.flatMap((study) => study.categories))
  );

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const removeFilter = (filter: string) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filter));
  };

  const filteredCaseStudies =
    activeFilters.length === 0
      ? caseStudies
      : caseStudies.filter((study) =>
          activeFilters.some((filter) => study.categories.includes(filter))
        );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold">Error al cargar los casos de estudio</p>
          <p className="mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Patrón con padding responsive
  const sectionShell = "max-w-[1200px] mx-auto px-4 md:px-6";

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-blend-overlay pt-0 pb-8">
      <div className={sectionShell}>

        {/* Hero Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-8">
          <div>
            <h1 className="text-[50px] lg:text-[57px] font-normal text-white mb-6 leading-tight">
              {publicFrontendCopy.caseStudiesIndex.title}
            </h1>
            <p className="text-white text-lg leading-relaxed opacity-90">
              {publicFrontendCopy.caseStudiesIndex.intro}
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <img
                src="/images/casos-de-exito.png"
                alt="Playful Agency - Casos de éxito"
                className="w-full max-w-sm lg:max-w-md"
              />
            </div>
          </div>
        </div>

        {/* Bottom Text Section */}
        <div className="lg:text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-normal text-white mb-6">
            {publicFrontendCopy.caseStudiesIndex.sectionTitle}
          </h2>
          <p className="text-white text-lg opacity-90 max-w-4xl mx-auto">
            {publicFrontendCopy.caseStudiesIndex.sectionDescription}
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-8">
          <div className="w-full bg-[#B3FFF3] rounded-3xl lg:rounded-full px-6 py-6 flex flex-col gap-4">
            {/* Contenedor con scroll horizontal en mobile */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex flex-nowrap lg:flex-wrap gap-2 whitespace-nowrap lg:whitespace-normal">
                {allCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleFilter(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      activeFilters.includes(category)
                        ? "bg-[#39DDCB] text-[#2A0064] shadow-sm"
                        : "bg-white/80 text-gray-700 hover:bg-white"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="mt-2">
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex flex-nowrap lg:flex-wrap gap-2 whitespace-nowrap lg:whitespace-normal">
                    {activeFilters.map((filter) => (
                      <span
                        key={filter}
                        className="inline-flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium"
                      >
                        {filter}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFilter(filter);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={`Eliminar filtro ${filter}`}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => setActiveFilters([])}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium ml-2"
                    >
                      Limpiar todo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grid de casos de éxito */}
        <div className="bg-[#E4FFF9] playful-Grid-CasosExito rounded-3xl my-8 w-full">
          <div className="py-8 px-4">
            {filteredCaseStudies.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-white mb-2">
                  No se encontraron resultados
                </h3>
                <p className="text-white/80">
                  Intenta con otros filtros o{" "}
                  <button
                    onClick={() => setActiveFilters([])}
                    className="text-white font-medium underline hover:text-teal-200"
                  >
                    limpiar todos los filtros
                  </button>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCaseStudies.map((caseStudy) => (
                  <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sección de Testimonios */}
        <div className="my-16">
          <TestimonialsSection textColor="#ffffff" />
        </div>

        {/* Sección del Blog */}
        <div className="my-16">
          <BlogRelatedPostsSection />
        </div>

        {/* Sección de dos columnas */}
        <div className="my-16">
          <TwoColumnCtaSection
            contentBgColor="#FFEFD1"
            title={publicFrontendCopy.caseStudiesIndex.cta.title}
            subtitle={publicFrontendCopy.caseStudiesIndex.cta.subtitle}
            ctaTitle={publicFrontendCopy.caseStudiesIndex.cta.ctaTitle}
          />
        </div>
      </div>
    </div>
  );
}
