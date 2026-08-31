import { getPageMetadataBySlug, TeamMember, getTeamMembers } from '@/services/wordpress';
import { canonicalForPath } from '@/utils/canonical';
import Image from 'next/image';
import TwoColumnCtaSection from '@/components/ui/TwoColumnCtaSection';
import CarouselResultados from '@/components/CarouselResultados';
import BlogRelatedPostsSection from '@/components/sections/BlogRelatedPostsSection';
import publicFrontendCopy from '@/utils/public-frontend-copy.json';

// Constante para clases de contenedor estandarizadas
const shell = "max-w-[1200px] mx-auto px-4 md:px-6";
const publicTeamDescriptions: Record<string, string> = publicFrontendCopy.about.teamDescriptions;

const getPublicTeamDescription = (memberId: number) =>
  publicTeamDescriptions[String(memberId)] ?? publicTeamDescriptions.default;

// --- COMPONENTE DE HISTORIA, MISIÓN Y VISIÓN ---
const HistorySection = () => {
  return (
    // Contenedor principal para la sección de Historia
    <section className="w-full relative overflow-hidden bg-[#E4FFF9] py-0 rounded-3xl my-0">
      {/* Overlay de confeti por encima del color */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/background.webp')] bg-cover bg-center bg-no-repeat"></div>
      {/* Sección superior: Imagen a la izquierda, texto a la derecha */}
      <div className="relative z-10 p-[20px] md:py-6">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Columna izquierda - Imagen */}
          <div className="w-full lg:w-1/2">
            <div className="relative w-full h-[400px] rounded-2xl overflow-hidden">
              <Image
                src="/images/nosotros/imagen-nosotros-historia.png"
                alt="Nuestra Historia"
                width={500}
                height={400}
                className="object-contain w-full h-full"
              />
            </div>
          </div>
          
          {/* Columna derecha - Texto */}
          <div className="w-full lg:w-1/2">
            <h2 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[32px] leading-[40px] text-[#453A53] mb-6">
              Historia
            </h2>
            <div className="space-y-4">
              <p className="[font-family:var(--font-dm-sans),sans-serif] font-medium text-[16px] leading-[24px] text-[#4A4453]">
                {publicFrontendCopy.about.history}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección inferior: Dos columnas con tarjetas de imagen y párrafo */}
      <div className="relative z-10 bg-transparent py-16 md:py-20 rounded-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16 p-[20px]">
          
          {/* Tarjeta 1 */}
          <div className="bg-[#E9D7FF] rounded-[32px] shadow-lg p-8 md:p-12 flex flex-col text-left min-h-[280px] w-full lg:w-[480px] mx-auto">
            <div className="relative w-full max-w-[220px] h-[180px] mb-6 mx-auto">
              <Image
                src="/images/nosotros/historia-eficiencia-seguridad.png"
                alt="Ilustración de estrategia digital"
                width={200}
                height={180}
                className="object-contain"
              />
            </div>
            <p className="[font-family:var(--font-dm-sans),sans-serif] font-medium text-[16px] leading-[24px] text-[#4A4453]">
              {publicFrontendCopy.about.capabilities}
            </p>
          </div>
          
          {/* Tarjeta 2 */}
          <div className="bg-[#E9D7FF] rounded-[32px] shadow-lg p-8 md:p-12 flex flex-col text-left min-h-[280px] w-full lg:w-[480px] mx-auto">
            <div className="relative w-full max-w-[220px] h-[180px] mb-6 mx-auto">
              <Image
                src="/images/nosotros/generamos-exito-roi.png"
                alt="Ilustración de plataformas de ecommerce"
                width={200}
                height={180}
                className="object-contain"
              />
            </div>
            <p className="[font-family:var(--font-dm-sans),sans-serif] font-medium text-[16px] leading-[24px] text-[#4A4453]">
              {publicFrontendCopy.about.platforms}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- COMPONENTE DE MISIÓN Y VISIÓN ---
const MissionVisionSection = () => {
  return (
    <section className="w-full rounded-3xl my-8">
      <div className="px-0 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tarjeta Misión */}
          <div className="bg-[#FFEFD1] rounded-[32px] shadow-lg p-8 md:p-12 flex flex-col text-left">
              <div className="relative w-full max-w-[220px] h-[180px] mb-6 mx-auto">
                <Image
                  src="/images/nosotros/nuestra-mision.png"
                  alt="Ilustración de la misión de Playful Agency"
                  width={200}
                  height={180}
                  className="object-contain"
                />
              </div>
              <h3 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[32px] leading-[40px] pt-[20px] text-[#453A53] mb-4">MISIÓN</h3>
              <p className="[font-family:var(--font-dm-sans),sans-serif] font-medium text-[16px] leading-[24px] text-[#4A4453]">
                Acompañar a equipos de ecommerce en el diseño, implementación y evolución de experiencias digitales funcionales. Trabajamos sobre arquitectura, interfaz, integraciones y medición para que cada proyecto tenga un alcance técnico definido y criterios de verificación claros.
              </p>
            </div>
          
          {/* Tarjeta Visión */}
          <div className="bg-[#FFDBDB] rounded-[32px] shadow-lg p-8 md:p-12 flex flex-col text-left">
              <div className="relative w-full max-w-[220px] h-[180px] mb-6 mx-auto">
                <Image
                  src="/images/nosotros/nuestra-vision.png"
                  alt="Ilustración de la visión de Playful Agency"
                  width={200}
                  height={180}
                  className="object-contain"
                />
              </div>
              <h3 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[32px] leading-[40px] pt-[20px] text-[#453A53] mb-4">VISIÓN</h3>
              <p className="[font-family:var(--font-dm-sans),sans-serif] font-medium text-[16px] leading-[24px] text-[#4A4453]">
                {publicFrontendCopy.about.vision}
              </p>
            </div>
        </div>
      </div>
    </section>
  );
};

// Componente para mostrar la tarjeta de un miembro del equipo
const TeamMemberCard = ({ member }: { member: TeamMember }) => {
  return (
    <div className="flex h-full w-full flex-col rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg transition-shadow duration-300 hover:shadow-2xl">
      <div className="flex flex-col items-center">
        <div className="relative mb-4 h-28 w-28">
          <Image
            src={member.acf.imagen.url}
            alt={member.acf.imagen.alt}
            width={112}
            height={112}
            className="rounded-full object-cover"
          />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">{member.acf.nombre}</h3>
        {member.acf.cargo && member.acf.cargo.trim() !== '' && (
          <p className="mb-2 w-full rounded-lg bg-[#440099] px-0 py-2 text-center text-sm font-semibold text-white">
            {member.acf.cargo}
          </p>
        )}
        {member.acf.habilidades.length > 0 && (
          <div className="mb-6 w-full">
            <div className={`grid ${member.acf.habilidades.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-2 w-full`}>
              {member.acf.habilidades.map((habilidad, index) => (
                <div 
                  key={index}
                  className="w-full rounded-lg bg-[#E9D7FF] px-4 py-2 text-center text-sm font-medium text-[#440099] whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {habilidad}
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mb-0 flex-grow text-gray-600">{getPublicTeamDescription(member.id)}</p>
        
      </div>
    </div>
  );
};

// --- COMPONENTE DE EQUIPO ---
const EquipoSection = async () => {
  // Obtener los miembros del equipo desde WordPress
  const teamMembers = await getTeamMembers();
  
  // Separar fundadores del resto del equipo
  const fundadores = teamMembers.filter(member => 
    member.acf.cargo?.toLowerCase().includes('fundador') || 
    member.acf.cargo?.toLowerCase().includes('fundadora')
  );
  
  const equipo = teamMembers.filter(member => 
    !member.acf.cargo?.toLowerCase().includes('fundador') && 
    !member.acf.cargo?.toLowerCase().includes('fundadora')
  );
  
  return (
    <section className="w-full relative overflow-hidden bg-[#E4FFF9] rounded-3xl my-16 p-[20px] md:p-[60px]">
      {/* Overlay de confeti sobre el color */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/background.webp')] bg-cover bg-center bg-no-repeat"></div>
      <div className="relative z-10 py-12 md:py-16">
        <h2 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[45px] leading-[40px] text-[#453A53] mb-12 text-center">
          Nuestro Equipo
        </h2>
        
        <p className="[font-family:var(--font-dm-sans),sans-serif] font-medium text-[16px] leading-[24px] text-[#4A4453] text-center max-w-3xl mx-auto mb-12">
          {publicFrontendCopy.about.teamIntro}
        </p>
        
        {/* Sección de Fundadores */}
        {fundadores.length > 0 && (
          <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {fundadores.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}
        
        {/* Sección del Equipo */}
        {equipo.length > 0 && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {equipo.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}
        
        {teamMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Próximamente más información sobre nuestro equipo.</p>
          </div>
        )}
      </div>
    </section>
  );
};

// --- COMPONENTE DE NUESTROS VALORES ---
const NuestrosValoresSection = () => {
  const valores = [
    {
      id: 1,
      titulo: 'Aprendizaje',
      descripcion: 'Nos comprometemos a desarrollar nuevas habilidades y mejorarnos constantemente, manteniendo una mentalidad abierta y enfocada en el crecimiento.',
      imagen: '/images/nosotros/aprendizaje.svg'
    },
    {
      id: 2,
      titulo: 'Franqueza',
      descripcion: 'Fomentamos una comunicación sincera y clara, expresándonos con honestidad para construir relaciones basadas en la confianza.',
      imagen: '/images/nosotros/franqueza.svg'
    },
    {
      id: 3,
      titulo: 'Honestidad',
      descripcion: 'Actuamos con total congruencia entre lo que decimos y lo que hacemos, evitando la mentira a toda costa,',
      imagen: '/images/nosotros/valores-honestidad.svg'
    },
    {
      id: 4,
      titulo: 'Independencia',
      descripcion: 'Valoramos nuestra capacidad para pensar y actuar de manera autónoma, tomando decisiones con criterio propio.',
      imagen: '/images/nosotros/independencia.svg'
    },
    {
      id: 5,
      titulo: 'Puntualidad',
      descripcion: 'Cumplimos con los compromisos y llegamos a tiempo, impulsados por el respeto y la responsabilidad hacia los demás.',
      imagen: '/images/nosotros/puntualidad.svg'
    },
    {
      id: 6,
      titulo: 'Servicio',
      descripcion: 'Estamos siempre disponibles para ayudar a otros de manera desinteresada, buscando el bienestar común.',
      imagen: '/images/nosotros/servicio.svg'
    }
  ];

  return (
    <section className="w-full py-12 md:py-16">
      <h2 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[32px] leading-[40px] text-[#453A53] text-center mb-12">
        Nuestros Valores
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
        {valores.map((valor) => (
          <div key={valor.id} className="flex flex-col items-center text-center p-8 md:p-12 bg-[#FEF7FF] rounded-[32px] shadow-lg hover:shadow-xl transition-shadow min-h-[500px]">
            <div className="mb-6 h-[180px] w-[200px] relative mx-auto">
              <Image
                src={valor.imagen}
                alt={valor.titulo}
                width={200}
                height={180}
                className="object-contain"
              />
            </div>
            <h3 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[24px] leading-[30px] text-[#453A53] mb-3">
              {valor.titulo}
            </h3>
            <p className="[font-family:var(--font-dm-sans),sans-serif] font-medium text-[16px] leading-[24px] text-[#4A4453]">
              {valor.descripcion}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};



// --- COMPONENTE DE PROPUESTA DE VALOR ---
const ValuePropositionSection = () => {
  const statistics = [
    { id: '1', number: 'Shopify', description: 'Implementación y evolución' },
    { id: '2', number: 'UX/UI', description: 'Flujos y arquitectura' },
    { id: '3', number: 'Headless', description: 'Integraciones y rendimiento' },
  ];

  return (
    <section className="w-full relative overflow-hidden bg-[#440099] rounded-3xl my-16 p-[30px] md:p-[80px]">
      {/* Overlay de confeti sobre el fondo morado */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/background.webp')] bg-cover bg-center bg-no-repeat"></div>
      <div className="relative z-10">
        <div className="text-center">
          <h2 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] text-white font-[700] text-[45px] leading-[52px] mb-6">
            Propuesta de valor de Playful
          </h2>
          <p className="mx-auto [font-family:var(--font-dm-sans),sans-serif] font-medium text-[16px] leading-[24px] text-[#E9D7FF] mb-12 min-[768px]:mb-16">
            Acompañamos a equipos de ecommerce en el análisis, diseño e implementación de mejoras técnicas: arquitectura de catálogo, experiencia de compra, integraciones, medición y mantenimiento evolutivo. El alcance y los criterios de verificación se definen para cada proyecto.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {statistics.map((stat) => (
              <div key={stat.id} className="text-center">
                <p className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] text-5xl md:text-6xl font-bold text-white mb-2 ">
                  {stat.number}
                </p>
                <p className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-normal leading-[141%] text-[22px] text-[#E9D7FF] line-clamp-2 mx-auto max-w-[80%] min-[768px]:max-w-[260px] min-[1024px]:max-w-[300px]">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};



// --- COMPONENTE PRINCIPAL DE LA PÁGINA "NOSOTROS" ---
export default async function Nosotros() {
  const metadata = await getPageMetadataBySlug('nosotros');
  
  // Obtener casos de éxito una sola vez en el servidor
  const { getAllCaseStudies } = await import('@/services/wordpress');
  const casosDeExito = await getAllCaseStudies();
  
  return (
    <main className="max-w-[1200px] mx-auto px-4 md:px-6 w-full">
      {/* Sección Superior "Nosotros" */}
      <div className="w-full">
          <div className="min-h-[480px] flex items-center pt-4 pb-12">
            <div className="w-full">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Columna Izquierda */}
                <div className="md:w-1/2 text-left">
                  <h1 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-normal text-[28px] leading-[32px] md:text-[20px] md:leading-[1.1] lg:text-[28px] text-[#4A4453] mb-4">
                    Para equipos que necesitan evolucionar su ecommerce
                  </h1>
                  <h2 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-normal leading-[1.1] text-[57px] text-[#440099] mb-6">
                    Diseño y desarrollo para ecommerce
                  </h2>
                  <div className="prose [font-family:var(--font-dm-sans),sans-serif] font-normal leading-[1.5] text-[14px] sm:text-[16px] text-gray-600 w-full max-w-none">
                    <p>
                      En Playful Agency convertimos requisitos de negocio en experiencias digitales funcionales. Nuestro equipo de diseño y desarrollo trabaja sobre arquitectura, flujos, interfaz e integraciones para resolver necesidades concretas de ecommerce.
                    </p>
                  </div>
                </div>
                
                {/* Columna Derecha */}
                <div className="md:w-1/2 flex justify-center w-full">
                  <div className="relative w-full max-w-[580px] min-h-[300px] md:h-[480px]">
                    <Image
                      src="/images/nosotros-playful-imagen.png"
                      alt="Playful Agency"
                      width={580}
                      height={480}
                      className="object-contain w-full h-auto"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* Sección "Propuesta de valor" */}
      <ValuePropositionSection />
      
      {/* Sección de Historia */}
      <HistorySection />
      
      {/* Sección de Misión y Visión */}
      <MissionVisionSection />
      
      {/* Sección Nuestros Valores */}
      <NuestrosValoresSection />
      
      {/* Sección Nuestro Equipo */}
      <EquipoSection />

      {/* Sección Casos de Éxito - Carrusel */}
      <section className="w-full py-12">
        <CarouselResultados
          casosDeExito={casosDeExito}
          title={publicFrontendCopy.caseStudiesCarousel.title}
          subtitle={publicFrontendCopy.caseStudiesCarousel.subtitle}
          title2={publicFrontendCopy.caseStudiesCarousel.title2}
          buttonText={publicFrontendCopy.caseStudiesCarousel.buttonText}
        />
      </section>

      {/* Sección del Blog */} 
      <BlogRelatedPostsSection />

      {/* Sección CTA */}
      <section className="w-full my-8 mb-[80px]">
        <TwoColumnCtaSection
          title={publicFrontendCopy.about.cta.title}
          subtitle={publicFrontendCopy.about.cta.subtitle}
          ctaTitle={publicFrontendCopy.about.cta.ctaTitle}
        />
      </section>
    </main>
  );
}


// --- FUNCIÓN PARA METADATOS (SEO) ---
export async function generateMetadata() {
  const url = canonicalForPath('/nosotros');
  const title = 'Agencia ecommerce Playful | Nosotros';
  const description = 'Somos Playful, agencia de ecommerce especializada en diseño, desarrollo, arquitectura e integraciones para tiendas que necesitan evolucionar.';
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
    },
  };
}
