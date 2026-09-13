import type { Metadata } from 'next';
import { getHomePageMetadata } from '@/services/wordpress';
import { canonicalForPath } from '@/utils/canonical';
import { ORGANIZATION_JSON_LD } from '@/utils/organization-schema.mjs';

const HOME_CANONICAL = canonicalForPath('/');

export async function generateMetadata(): Promise<Metadata> {
  const defaultTitle = 'Playful Agency - Agencia de E-commerce | Marketing Digital';
  const defaultDescription = '¿Tu e-commerce está perdiendo dinero sin que lo sepas? En Playful Agency transformamos plataformas mediocres en máquinas de conversión de alto rendimiento.';
  const defaultOgImage = 'https://playfulagency.com/og.jpg';

  // Next.js 15 resolveAbsoluteUrlWithPathname collapses pathname `/` to origin
  // (no trailing slash). Home canonical + og:url are emitted as raw tags below
  // so they stay exactly `https://playfulagency.com/` to match the sitemap.
  try {
    const yoastData = await getHomePageMetadata();
    return {
      title: yoastData.yoast_wpseo_title || defaultTitle,
      description: yoastData.yoast_wpseo_metadesc || defaultDescription,
      openGraph: {
        title: yoastData.yoast_wpseo_og_title || yoastData.yoast_wpseo_title || defaultTitle,
        description: yoastData.yoast_wpseo_og_description || yoastData.yoast_wpseo_metadesc || defaultDescription,
        type: 'website',
        locale: 'es_ES',
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
        description: yoastData.yoast_wpseo_og_description || yoastData.yoast_wpseo_metadesc || defaultDescription,
        images: [defaultOgImage],
      },
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
import { getAllCaseStudies, getLatestBlogPosts } from "@/services/wordpress";

const shell = "max-w-[1200px] mx-auto px-4 md:px-6";

async function HomeContent() {
  // Obtener casos de éxito y posts del bloque de blog una sola vez en el servidor
  const [casosDeExito, blogPosts] = await Promise.all([
    getAllCaseStudies(),
    getLatestBlogPosts(6).catch(() => []),
  ]);
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
                  ¿Tu e-commerce está perdiendo dinero sin que lo sepas?{" "}
                </p>
              </div>

              <div className="space-y-4 2 text-purple-800">
                <p className="playful-contenido-p">
                Tu sitio web no es solo un escaparate digital; es tu motor de ventas más crucial. Pero si tu web es lenta, confusa o se ve anticuada, no solo estás perdiendo clientes, sino que estás{" "}
                  <b>dejando dinero sobre la mesa</b>.
                </p>
                <p className="playful-contenido-p">
                  En <b>Playful Agency</b>, somos una <b>Agencia de E-commerce</b>
                  que va más allá del diseño. Nos especializamos en transformar plataformas mediocres en
                  <b> máquinas de conversión de alto rendimiento</b>. No creamos webs bonitas por hacer; desarrollamos tecnología que se traduce en <b>ventas consistentes y crecimiento real</b>.
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
          <CarouselResultados casosDeExito={casosDeExito} />
        </div>
      </section>

      <section className="py-12">
        <div className={shell}>
          <TestimonialsSection />
        </div>
      </section>

      <section className="py-12">
        <div className={shell}>
          <BlogRelatedPostsSection posts={blogPosts} />
        </div>
      </section>

      <section className="py-12">
        <div className={shell}>
          <TwoColumnCtaSection 
            contentBgColor="#B3FFF3"
            imageUrl="/images/imagen-nueva-cta-home.png"
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
      <link rel="canonical" href={HOME_CANONICAL} />
      <meta property="og:url" content={HOME_CANONICAL} />
      <script
        id="playful-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ORGANIZATION_JSON_LD }}
      />
      <h1 className="sr-only">
        ¿Tu e-commerce está perdiendo dinero sin que lo sepas?{" "}
      </h1>
      <HomePageContent>
        <HomeContent />
      </HomePageContent>
    </>
  );
}
