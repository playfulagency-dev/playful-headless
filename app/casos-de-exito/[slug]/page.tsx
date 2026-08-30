import Image from 'next/image';
import { getSuccessStoryBySlug } from '@/services/wordpress';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { canonicalForPath } from '@/utils/canonical';
import { getPublicCaseStudySeoOverride } from '@/utils/public-case-study-overrides';
import SoyTechnoSectionA from '@/components/soytechno/SoyTechnoSectionA';
import SoyTechnoSectionB from '@/components/soytechno/SoyTechnoSectionB';
import SoyTechnoSectionC from '@/components/soytechno/SoyTechnoSectionC';
import SoyTechnoSectionD from '@/components/soytechno/SoyTechnoSectionD';
import SoyTechnoSectionE from '@/components/soytechno/SoyTechnoSectionE';
import SoyTechnoSectionF from '@/components/soytechno/SoyTechnoSectionF';
import PhoneCarouselSection from './PhoneCarouselSection';
import CasoExitoCta from './CasoExitoCta';




export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = canonicalForPath(`/casos-de-exito/${slug}`);
  const override = getPublicCaseStudySeoOverride(slug);
  if (override) {
    return {
      title: override.title,
      description: override.description,
      alternates: { canonical: url },
      openGraph: {
        title: override.title,
        description: override.description,
        url,
      },
    };
  }
  return {
    alternates: { canonical: url },
    openGraph: { url },
  };
}

const ResultIcon1 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
  </svg>
);

const ResultIcon2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m3 6V7h-2m3-4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"></path>
  </svg>
);

const ResultIcon3 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
  </svg>
);

const CheckmarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
  </svg>
);

export default async function SuccessStoryPage({
  params,
}: {
  params: any;
}) {
  const resolvedParams = await params;
  const { slug } = resolvedParams as { slug: string };

  if (!slug) {
    notFound();
  }

  const story = await getSuccessStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  // SoyTechno template detection
  const isSoyTechno = story.acf?.template === "soytechno_extended";
  const st = story.acf?.soytechno;
  
  // Debug logs
  console.log('=== SOYTECHNO DEBUG ===');
  console.log('isSoyTechno:', isSoyTechno);
  console.log('story.acf.template:', story.acf?.template);
  console.log('story.acf.soytechno:', story.acf?.soytechno);
  console.log('st:', st);
  console.log('st?.seccion_a:', st?.seccion_a);
  console.log('st?.seccion_f:', st?.seccion_f);
  console.log('=== END DEBUG ===');

  return (
    <div className="text-gray-800">
      {/* Hero Section */}
      <section className="text-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 bg-[#E9D7FF] rounded-t-[18px] p-5 md:p-[80px] mt-[40px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-left md:pt-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[#4A4453]">
                {story.title.rendered}
              </h1>
              <p
                className="text-base sm:text-lg text-[#4A4453]"
                dangerouslySetInnerHTML={{ __html: story.acf.primerap || '' }}
              />
            </div>
            <div>
              <div className="relative w-full h-[300px] sm:h-[350px] md:h-[400px] rounded-lg overflow-hidden bg-gray-100">
                {story.acf?.imagenbanner ? (
                  <Image
                    src={
                      typeof story.acf.imagenbanner === 'string'
                        ? story.acf.imagenbanner
                        : story.acf.imagenbanner.url
                    }
                    alt={story.title.rendered}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-opacity duration-300"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                    <span className="text-gray-500">No hay imagen disponible</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-[#FEF7FF] ">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 ">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2A0064] mb-4 sm:mb-6">
            {story.acf.primerh2 || 'El Desafío'}
          </h2>
          {story.acf.segundap && (
            <div
              className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6"
              dangerouslySetInnerHTML={{ __html: story.acf.segundap }}
            />
          )}
          <div
            className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-12"
            dangerouslySetInnerHTML={{ __html: story.acf.tercerap || '' }}
          />
          {Array.isArray(story.acf?.challenge_logos) &&
            story.acf.challenge_logos.length > 0 && (
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                {story.acf.challenge_logos.map((logo: any, index: number) => (
                  <div
                    key={index}
                    className="relative h-16 w-32 md:h-20 md:w-40 flex items-center justify-center"
                  >
                    <Image
                      src={logo.url}
                      alt={logo.alt || `Logo ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 8rem, 10rem"
                      className="object-contain object-center opacity-70 hover:opacity-100 transition-opacity duration-300"
                      quality={90}
                    />
                  </div>
                ))}
              </div>
            )}
        </div>
      </section>

      {/* Work Process Images with Title and Description */}
      {(story.acf?.imagenminuta1 ||
        story.acf?.imagenminuta2 ||
        story.acf?.imagenminuta3 ||
        story.acf?.segundoh2 ||
        story.acf?.tercerap) && (
        <section className="py-0 bg-[#FEF7FF]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center">
          <div className="flex flex-col md:flex-row justify-center items-center md:items-stretch gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
             {[story.acf?.imagenminuta1, story.acf?.imagenminuta2, story.acf?.imagenminuta3]
              .filter(Boolean)
              .map((image, index) => {
                const src =
                  typeof image === 'string'
                    ? image
                    : (image as { url: string; alt?: string }).url;

                return (
                  <div
                    key={index}
                    className="relative w-36 h-36 bg-white rounded-lg shadow-md flex items-center justify-center p-4"
                  >
                    <Image
                      src={src}
                      alt={`Imagen ${index + 1}`}
                      width={120}
                      height={120}
                      className="object-contain w-full h-full"
                    />
                  </div>
                );
              })}
            </div>

            <div className="text-center max-w-4xl px-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2A0064] mb-4 sm:mb-6">
                {story.acf?.segundoh2 || ''}
              </h2>
              <div
                className="text-base sm:text-lg text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: story.acf?.tercerap || '' }}
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Content Grid Section */}
      {(story.acf?.cuartap ||
        story.acf?.quintap ||
        story.acf?.sextap ||
        story.acf?.septimap ||
        story.acf?.octavap ||
        story.acf?.novenap ||
        story.acf?.desafioimagen1 ||
        story.acf?.desafioimagen2 ||
        story.acf?.desafioimagen3 ||
        story.acf?.desafioimagen4) && (
        <section className="py-12 sm:py-16 bg-[#FEF7FF]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="bg-[#E9D7FF] rounded-[18px] sm:rounded-[24px] p-4 sm:p-6 md:p-8 lg:p-10">
            {/* Contenedor principal sin fondo */}
            <div className="p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 justify-items-center">
                {/* Columna Izquierda - 50% */}
                <div className="p-0 m-0 flex flex-col justify-between w-full">
                  {/* Cuadrado grande arriba: Textos */}
                  <div className="bg-white rounded-[18px] p-4 sm:p-6 md:p-8 shadow-[0_8px_24px_rgba(15,23,42,0.08)] min-h-[400px] sm:min-h-[500px] md:h-[600px]">
                    {[
                      {
                        content: story.acf?.cuartap,
                        className:
                          'text-[#005F9E] font-payton font-bold text-[18px] md:text-[20px] leading-relaxed',
                      },
                      {
                        content: story.acf?.quintap,
                        className:
                          'text-[#4A4453] font-dmsans text-[15px] md:text-[17px] leading-relaxed',
                      },
                      {
                        content: story.acf?.sextap,
                        className:
                          'text-[#F78D2B] font-payton font-bold text-[18px] md:text-[20px] leading-relaxed mt-4',
                      },
                      {
                        content: story.acf?.septimap,
                        className:
                          'text-[#4A4453] font-dmsans text-[15px] md:text-[17px] leading-relaxed',
                      },
                      {
                        content: story.acf?.octavap,
                        className:
                          'text-[#44A147] font-payton font-bold text-[18px] md:text-[20px] leading-relaxed mt-4',
                      },
                      {
                        content: story.acf?.novenap,
                        className:
                          'text-[#4A4453] font-dmsans text-[15px] md:text-[17px] leading-relaxed',
                      },
                    ]
                      .filter((item) => item.content)
                      .map((item, index) => (
                        <div
                          key={`texto-grid-${index}`}
                          className={item.className}
                          dangerouslySetInnerHTML={{ __html: item.content || '' }}
                        />
                      ))}
                  </div>

                  {/* DesafioImagen3 con contenedor especial */}
                  {story.acf?.desafioimagen3 && (
                    <div className="bg-[#FFEFD1] rounded-[24px] sm:rounded-[36px] p-4 sm:p-[18px] overflow-hidden mt-4 sm:mt-6 grid justify-items-center">
                      <div className="relative w-full max-w-[420px] h-[180px] sm:h-[240px]">
                        <Image
                          src={
                            typeof story.acf.desafioimagen3 === 'string'
                              ? story.acf.desafioimagen3
                              : (story.acf.desafioimagen3 as { url: string }).url
                          }
                          alt="Mockup móvil"
                          fill
                          className="object-contain"
                          sizes="450px"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha - 50% */}
                <div className="p-0 m-0 space-y-4 sm:space-y-6 w-full">
                  {/* 1. DesafioImagen1 - Logo */}
                  {story.acf?.desafioimagen1 && (
                    <div className="relative w-full max-w-[420px] h-[180px] sm:h-[220px] rounded-2xl overflow-hidden mx-auto">
                      <Image
                        src={
                          typeof story.acf.desafioimagen1 === 'string'
                            ? story.acf.desafioimagen1
                            : (story.acf.desafioimagen1 as { url: string }).url
                        }
                        alt="Logo cliente"
                        fill
                        className="object-contain"
                        sizes="450px"
                      />
                    </div>
                  )}

                  {/* 2. DesafioImagen2 - Teléfono */}
                  {story.acf?.desafioimagen2 && (
                    <div className="relative w-full max-w-[420px] h-[300px] sm:h-[380px] rounded-2xl overflow-hidden mx-auto">
                      <Image
                        src={
                          typeof story.acf.desafioimagen2 === 'string'
                            ? story.acf.desafioimagen2
                            : (story.acf.desafioimagen2 as { url: string }).url
                        }
                        alt="Teléfono mockup"
                        fill
                        className="object-contain"
                        sizes="450px"
                      />
                    </div>
                  )}

                  {/* 3. DesafioImagen4 - Imagen inferior */}
                  {story.acf?.desafioimagen4 && (
                    <div className="relative w-full max-w-[420px] h-[220px] sm:h-[270px] rounded-2xl overflow-hidden mx-auto">
                      <Image
                        src={
                          typeof story.acf.desafioimagen4 === 'string'
                            ? story.acf.desafioimagen4
                            : (story.acf.desafioimagen4 as { url: string }).url
                        }
                        alt="Mockup desktop"
                        fill
                        className="object-contain"
                        sizes="450px"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Work Process (segunda) */}
      {(story.acf?.tercerh2 ||
        story.acf?.decima ||
        story.acf?.imagenminuta1 ||
        story.acf?.imagenminuta2 ||
        story.acf?.imagenminuta3 ||
        story.acf?.otroh2st ||
        story.acf?.otropst) && (
        <section className="py-0 bg-[#FEF7FF]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center">
            {/* Título y descripción */}
            <div className="text-center max-w-4xl px-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2A0064] mb-4 sm:mb-6">
                {story.acf?.tercerh2 || 'Nuestro Enfoque'}
              </h2>
              <div
                className="text-base sm:text-lg text-gray-700 leading-relaxed mb-8 sm:mb-12"
                dangerouslySetInnerHTML={{ __html: story.acf?.decima || '' }}
              />
            </div>

            {/* Grid de 3 imágenes minutas */}
            <div className="flex flex-col md:flex-row justify-center items-center md:items-stretch gap-6 md:gap-8 mb-12">
              {[story.acf?.imagenminuta1, story.acf?.imagenminuta2, story.acf?.imagenminuta3]
                .filter(Boolean)
                .map((image, index) => {
                  const src =
                    typeof image === 'string'
                      ? image
                      : (image as { url: string; alt?: string }).url;

                  return (
                    <div
                      key={index}
                      className="relative w-36 h-36 bg-white rounded-lg shadow-md flex items-center justify-center p-4"
                    >
                      <Image
                        src={src}
                        alt={`Imagen ${index + 1}`}
                        width={120}
                        height={120}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  );
                })}
            </div>

            {/* Segundo título y párrafo */}
            <div className="text-center max-w-4xl px-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2A0064] mb-4 sm:mb-6">
                {story.acf?.otroh2st || ''}
              </h2>
              <div
                className="text-base sm:text-lg text-gray-700 leading-relaxed mb-8 sm:mb-12"
                dangerouslySetInnerHTML={{ __html: story.acf?.otropst || '' }}
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* SoyTechno Extended Sections */}
      {isSoyTechno && st?.seccion_a && <SoyTechnoSectionA data={st.seccion_a} />}
      {isSoyTechno && st?.seccion_b && <SoyTechnoSectionB data={st.seccion_b} />}
      {isSoyTechno && st?.seccion_c && <SoyTechnoSectionC data={st.seccion_c} />}
      {isSoyTechno && st?.seccion_d && <SoyTechnoSectionD data={st.seccion_d} />}
      {isSoyTechno && st?.seccion_e && <SoyTechnoSectionE data={st.seccion_e} />}
      {isSoyTechno && (() => {
        console.log('seccion_f raw', st?.seccion_f);
        return st?.seccion_f && <SoyTechnoSectionF data={st.seccion_f} />;
      })()}

      {/* Development Process Section */}
      {(story.acf?.imagendesarrollo ||
        story.acf?.primerah3desarrollo ||
        story.acf?.primerapdesarrollo ||
        story.acf?.segundah3desarrollo ||
        story.acf?.segundapdesarrollo ||
        story.acf?.tercerh3desarrollo ||
        story.acf?.tercerapdesarrollo) && (
        <section className="py-12 sm:py-16 bg-[#FEF7FF]">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="relative">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
                <div className="relative w-full h-[400px] sm:h-[500px] lg:h-[800px] rounded-xl overflow-hidden">
                  {story.acf?.imagendesarrollo ? (
                    <Image
                      src={
                        typeof story.acf.imagendesarrollo === 'string'
                          ? story.acf.imagendesarrollo
                          : story.acf.imagendesarrollo.url
                      }
                      alt="Proceso de desarrollo"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50%"
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <span className="text-gray-500">Imagen no disponible</span>
                    </div>
                  )}
                </div>

                <div className="space-y-6 sm:space-y-8">
                  <div className="hidden">
                    {JSON.stringify({
                      primerh3desarrollo: story.acf?.primerh3desarrollo,
                      primerapdesarrollo: story.acf?.primerapdesarrollo,
                      segundoh3desarrollo: story.acf?.segundoh3desarrollo,
                      segundopdesarrollo: story.acf?.segundopdesarrollo,
                      tercerh3desarrollo: story.acf?.tercerh3desarrollo,
                      tercerapdesarrollo: story.acf?.tercerapdesarrollo,
                    })}
                  </div>

                  {story.acf?.primerah3desarrollo && story.acf.primerapdesarrollo && (
                    <div className="space-y-4">
                      <h3 className="text-[22px] font-payton text-[#453A53] mb-3">
                        {story.acf.primerah3desarrollo}
                      </h3>
                      <div
                        className="text-gray-700 leading-relaxed text-lg"
                        dangerouslySetInnerHTML={{ __html: story.acf.primerapdesarrollo }}
                      />
                    </div>
                  )}

                  {story.acf?.segundah3desarrollo && story.acf.segundapdesarrollo && (
                    <div className="space-y-4">
                      <h3 className="text-[22px] font-payton text-[#453A53] mb-3">
                        {story.acf.segundah3desarrollo}
                      </h3>
                      <div
                        className="text-gray-700 leading-relaxed text-lg"
                        dangerouslySetInnerHTML={{ __html: story.acf.segundapdesarrollo }}
                      />
                    </div>
                  )}

                  {story.acf?.tercerh3desarrollo && story.acf.tercerapdesarrollo && (
                    <div className="space-y-4">
                      <h3 className="text-[22px] font-payton text-[#453A53] mb-3">
                        {story.acf.tercerh3desarrollo}
                      </h3>
                      <div
                        className="text-gray-700 leading-relaxed text-lg"
                        dangerouslySetInnerHTML={{ __html: story.acf.tercerapdesarrollo }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {(story.acf?.grilla1 ||
        story.acf?.grilla2 ||
        story.acf?.grilla3 ||
        story.acf?.grilla4 ||
        story.acf?.grilla5 ||
        story.acf?.grilla6 ||
        story.acf?.grilla7 ||
        story.acf?.grilla8) && (
        <section className="py-16 bg-[#FEF7FF]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-20 bg-[#E9D7FF] rounded-t-[18px]">
          {/* Grid Masonry de 3 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Columna 1: grilla1, grilla4, grilla5 */}
            <div className="flex flex-col gap-[10px] md:gap-4 md:justify-between md:h-full">
              {story.acf?.grilla1 && (
                <div className="relative w-full rounded-xl overflow-hidden">
                  <Image
                    src={
                      typeof story.acf.grilla1 === 'string'
                        ? story.acf.grilla1
                        : story.acf.grilla1.url
                    }
                    alt="Gallery image 1"
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              {story.acf?.grilla4 && (
                <div className="relative w-full rounded-xl overflow-hidden">
                  <Image
                    src={
                      typeof story.acf.grilla4 === 'string'
                        ? story.acf.grilla4
                        : story.acf.grilla4.url
                    }
                    alt="Gallery image 4"
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              {story.acf?.grilla5 && (
                <div className="relative w-full rounded-xl overflow-hidden">
                  <Image
                    src={
                      typeof story.acf.grilla5 === 'string'
                        ? story.acf.grilla5
                        : (story.acf.grilla5 as { url: string }).url
                    }
                    alt="Gallery image 5"
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
            </div>

            {/* Columna 2: grilla2, grilla6 */}
            <div className="flex flex-col gap-[10px] md:gap-4">
              {story.acf?.grilla2 && (
                <div className="relative w-full rounded-xl overflow-hidden">
                  <Image
                    src={
                      typeof story.acf.grilla2 === 'string'
                        ? story.acf.grilla2
                        : story.acf.grilla2.url
                    }
                    alt="Gallery image 2"
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              {story.acf?.grilla6 && (
                <div className="relative w-full rounded-xl overflow-hidden">
                  <Image
                    src={
                      typeof story.acf.grilla6 === 'string'
                        ? story.acf.grilla6
                        : story.acf.grilla6.url
                    }
                    alt="Gallery image 6"
                    width={400}
                    height={600}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
            </div>

            {/* Columna 3: grilla3, grilla7, grilla8 */}
            <div className="flex flex-col gap-[10px] md:gap-4 md:justify-between md:h-full">
              {story.acf?.grilla3 && (
                <div className="relative w-full rounded-xl overflow-hidden">
                  <Image
                    src={
                      typeof story.acf.grilla3 === 'string'
                        ? story.acf.grilla3
                        : story.acf.grilla3.url
                    }
                    alt="Gallery image 3"
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              {story.acf?.grilla7 && (
                <div className="relative w-full rounded-xl overflow-hidden">
                  <Image
                    src={
                      typeof story.acf.grilla7 === 'string'
                        ? story.acf.grilla7
                        : story.acf.grilla7.url
                    }
                    alt="Gallery image 7"
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              {story.acf?.grilla8 && (
                <div className="relative w-full rounded-xl overflow-hidden">
                  <Image
                    src={
                      typeof story.acf.grilla8 === 'string'
                        ? story.acf.grilla8
                        : (story.acf.grilla8 as { url: string }).url
                    }
                    alt="Gallery image 8"
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
      )}

      <section className="py-0 bg-[#FEF7FF]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center">
            <div className="text-center max-w-4xl">
              <h2 className="text-3xl md:text-4xl font-bold text-[#2A0064] mb-6">
                {story.acf?.resultadotitulo || 'Nuestro Enfoque'}
              </h2>
              <div
                className="text-lg text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: story.acf?.resultadodescripcion || '',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Results Cards Section */}
      <section className="py-16 bg-[#FEF7FF]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="rounded-[18px] px-6 py-12 md:px-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12 max-w-6xl mx-auto">
              {(story.acf?.resultado1 || story.acf?.resultadop1) && (
                <div className="bg-[#E9D7FF] rounded-[24px] px-8 py-10 h-full min-h-[420px] flex flex-col justify-start w-full max-w-[380px] mx-auto md:max-w-none md:w-full text-center">
                  <h3 className="text-base md:text-lg font-paytone font-bold tracking-wide text-[#2A0064] mb-6 uppercase leading-tight">
                    {story.acf?.resultado1}
                  </h3>
                  <div
                    className="text-base md:text-[17px] leading-relaxed text-[#4A4453] font-dmsans"
                    dangerouslySetInnerHTML={{
                      __html: story.acf?.resultadop1 || '',
                    }}
                  />
                </div>
              )}

              {(story.acf?.resultado2 || story.acf?.resultadop2) && (
                <div className="bg-[#E9D7FF] rounded-[24px] px-8 py-10 h-full min-h-[420px] flex flex-col justify-start w-full max-w-[380px] mx-auto md:max-w-none md:w-full text-center">
                  <h3 className="text-base md:text-lg font-paytone font-bold tracking-wide text-[#2A0064] mb-6 uppercase leading-tight">
              {story.acf?.resultado2}
            </h3>
            <div
              className="text-base md:text-[17px] leading-relaxed text-[#4A4453] font-dmsans"
              dangerouslySetInnerHTML={{
                __html: story.acf?.resultadop2 || '',
              }}
            />
          </div>
        )}

        {(story.acf?.resultado3 || story.acf?.resultadop3) && (
          <div className="bg-[#E9D7FF] rounded-[24px] px-8 py-10 h-full min-h-[420px] flex flex-col justify-start w-full max-w-[380px] mx-auto md:max-w-none md:w-full text-center">
            <h3 className="text-base md:text-lg font-paytone font-bold tracking-wide text-[#2A0064] mb-6 uppercase leading-tight">
              {story.acf?.resultado3}
            </h3>
            <div
              className="text-base md:text-[17px] leading-relaxed text-[#4A4453] font-dmsans"
              dangerouslySetInnerHTML={{
                __html: story.acf?.resultadop3 || '',
              }}
            />
          </div>
        )}
      </div>
    </div>
  </div>
</section>

      {/* Phone Images Section */}
      {(story.acf?.telefono1 || story.acf?.telefono2 || story.acf?.telefono3 || story.acf?.telefono4) && (
      <PhoneCarouselSection phones={{
        telefono1: story.acf?.telefono1,
        telefono2: story.acf?.telefono2,
        telefono3: story.acf?.telefono3,
        telefono4: story.acf?.telefono4,
        telefonos: story.acf?.telefonos,
          }} />
        )}

      {/* Testimonial Section */}
      {(story.acf?.testimonialnombre || story.acf?.testimonio) && (
        <section className="py-16 bg-[#FEF7FF]">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="mx-auto w-full max-w-[1200px]">
              <div className="bg-[#FFD977] rounded-[26px] px-8 py-10 md:px-14 md:py-14 relative overflow-hidden min-h-[400px]">
                <div className="w-full h-full flex flex-col md:flex-row items-center gap-8">
                  {/* Columna izquierda: 40% - Foto y cargo */}
                  <div className="w-full md:w-[40%] flex flex-col items-center justify-center gap-4">
                    {story.acf?.testimonial_foto && (
                      <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white/70 ring-4 ring-white/60">
                        <Image
                          src={
                            typeof story.acf.testimonial_foto === 'string'
                              ? (story.acf.testimonial_foto as string)
                              : (story.acf.testimonial_foto as { url: string }).url
                          }
                          alt={story.acf?.testimonialnombre || 'Testimonial'}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      </div>
                    )}

                    {story.acf?.testimonialnombre && (
                      <p className="text-2xl md:text-3xl font-paytone font-bold text-[#2A0064] leading-tight text-center">
                        {story.acf.testimonialnombre}
                      </p>
                    )}

                    {story.acf?.testimonialcargo && (
                      <p className="text-base md:text-lg font-dmsans text-[#2A0064]/80 text-center">
                        {story.acf.testimonialcargo}
                      </p>
                    )}
                  </div>

                  {/* Columna derecha: 60% - Testimonio con comillas de fondo */}
                  <div className="w-full md:w-[60%]">
                    <section className="relative flex items-center justify-center min-h-[300px]">
                      {/* Imagen de comillas como fondo */}
                      <div className="pointer-events-none absolute inset-0 opacity-45">
                        <Image
                          src="/images/comillas.png"
                          alt=""
                          width={520}
                          height={520}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                          priority
                        />
                      </div>

                      {/* Testimonio */}
                      {story.acf?.testimonio && (
                        <div className="relative z-10 px-4 md:px-8">
                          <p 
                            className="font-dmsans leading-relaxed text-center italic"
                            style={{
                              fontSize: '24px',
                              color: '#2A0064',
                              fontWeight: 500,
                            }}
                          >
                            {story.acf.testimonio}
                          </p>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Final Dinámico desde ACF */}
      {(() => {
        const cta = story.acf?.mostrar_cta_final;
        
        if (!cta?.mostrar_cta || !cta?.titulo_del_cta) return null;
        
        return (
          <section className="py-0 pb-20 bg-[#FEF7FF]">
            <div className="max-w-[1200px] mx-auto px-4 md:px-6">
              <CasoExitoCta
                title={cta.titulo_del_cta}
                description={cta.descripcion || ''}
                title2={cta.titulo2 || ''}
                paragraph2={cta.parrafo2 || ''}
              />
            </div>
          </section>
        );
      })()}
    </div>
  );
}
