import type { Metadata } from 'next';
import { getHomePageMetadata } from '@/services/wordpress';
import { canonicalForPath } from '@/utils/canonical';
import publicFrontendCopy from '@/utils/public-frontend-copy.json';

export async function generateMetadata(): Promise<Metadata> {
  const defaultTitle = 'Playful Agency - Agencia de E-commerce | Marketing Digital';
  const defaultDescription = publicFrontendCopy.home.metadataDescription;
  const defaultOgImage = 'https://playfulagency.com/og.jpg';
  const url = canonicalForPath('/');

  try {
    const yoastData = await getHomePageMetadata();
    return {
      title: yoastData.yoast_wpseo_title || defaultTitle,
      description: defaultDescription,
      openGraph: {
        title: yoastData.yoast_wpseo_og_title || yoastData.yoast_wpseo_title || defaultTitle,
        description: defaultDescription,
        type: 'website',
        locale: 'es_ES',
        url,
        siteName: 'Playful Agency',
        images: [{
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: 'Playful Agency - Agencia de E-commerce',
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: yoastData.yoast_wpseo_og_title || yoastData.yoast_wpseo_title || defaultTitle,
        description: defaultDescription,
        images: [defaultOgImage],
      },
      alternates: { canonical: url },
    };
  } catch {
    return {
      title: defaultTitle,
      description: defaultDescription,
      openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        type: 'website',
        locale: 'es_ES',
        url,
        siteName: 'Playful Agency',
        images: [{
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: 'Playful Agency - Agencia de E-commerce',
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDescription,
        images: [defaultOgImage],
      },
      alternates: { canonical: url },
    };
  }
}

import Link from "next/link";
import AnimatedButton from "@/components/AnimatedButton";
import MaterialServicesSection from "@/components/MaterialServicesSection";
import SolucionesPlayful from "@/components/SolucionesPlayful";
import CarouselResultados from "@/components/CarouselResultados";
import TestimonialsSection from "@/components/TestimonialsSectionClient";
import { HomePageContent } from "./HomePageContent";
import TwoColumnCtaSection from "@/components/ui/TwoColumnCtaSection";
import BlogPosts from "@/components/BlogPosts";
import BlogRelatedPostsSection from "@/components/sections/BlogRelatedPostsSection";
import { getAllCaseStudies } from "@/services/wordpress";

const shell = "max-w-[1200px] mx-auto px-4 md:px-6";

async function HomeContent() {
  // Obtener casos de éxito una sola vez en el servidor
  const casosDeExito = await getAllCaseStudies();
  return (
    <div className="">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className={`${shell} pt-4 pb-20`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="playful-miga-pan">Playful Agency:</p>
                <p className="playful-h1">
                  {publicFrontendCopy.home.heroTitle}
                </p>
              </div>

              <div className="space-y-4 2 text-purple-800">
                <p className="playful-contenido-p">
                  {publicFrontendCopy.home.heroParagraphs[0]}
                </p>
                <p className="playful-contenido-p">
                  {publicFrontendCopy.home.heroParagraphs[1]}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/contactar-agencia-de-marketing-digital" className="playful-boton">
                    Completa el formulario y cuéntanos tu idea
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Illustration Area */}
            <div className="relative">
              <img
                src="../images/playful-imagen-banner.png"
                alt=""
              />
            </div>
          </div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-purple-300 rounded-full opacity-60 animate-bounce"></div>
        <div
          className="absolute top-40 right-20 w-6 h-6 bg-pink-300 rounded-full opacity-60 animate-bounce"
          style={{ animationDelay: "0.5s" }}
        ></div>
        <div
          className="absolute bottom-40 left-20 w-3 h-3 bg-teal-300 rounded-full opacity-60 animate-bounce"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 right-40 w-5 h-5 bg-yellow-300 rounded-full opacity-60 animate-bounce"
          style={{ animationDelay: "1.5s" }}
        ></div>
      </section>

      {/* Material UI Services Section */}
      <MaterialServicesSection className={shell} />

      <SolucionesPlayful className={shell} />

      <section className="py-12">
        <div className={shell}>
          <CarouselResultados
            casosDeExito={casosDeExito}
            title={publicFrontendCopy.caseStudiesCarousel.title}
            subtitle={publicFrontendCopy.caseStudiesCarousel.subtitle}
            title2={publicFrontendCopy.caseStudiesCarousel.title2}
            buttonText={publicFrontendCopy.caseStudiesCarousel.buttonText}
          />
        </div>
      </section>

      <section className="py-12">
        <div className={shell}>
          <TestimonialsSection />
        </div>
      </section>

      <section className="py-12">
        <div className={shell}>
          <BlogRelatedPostsSection />
        </div>
      </section>

      <section className="py-12">
        <div className={shell}>
          <TwoColumnCtaSection
            contentBgColor="#B3FFF3"
            imageUrl="/images/imagen-nueva-cta-home.png"
            title={publicFrontendCopy.home.cta.title}
            subtitle={publicFrontendCopy.home.cta.subtitle}
            ctaTitle={publicFrontendCopy.home.cta.ctaTitle}
            buttonText="Llena el formulario y hablemos sobre tu web"
            buttonLink="/contactar-agencia-de-marketing-digital"
          />
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <h1 className="sr-only">
        {publicFrontendCopy.home.heroTitle}
      </h1>
      <HomePageContent>
        <HomeContent />
      </HomePageContent>
    </>
  );
}
