"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Image from "next/image";
import publicFrontendCopy from "@/utils/public-frontend-copy.json";

const testimonials = [
  {
    id: 1,
    name: "Santi Lukac",
    role: "",
    content:
      "Unos genios!! Por su conocimiento, su excelente predisposición, su eficiencia.. Muy agradecido",
    avatar: "/images/avatars/avatar1.jpg",
  },
  {
    id: 2,
    name: "Carlos Suarez",
    role: "",
    content:
      "Playful ha sido de gran valor para nuestra ONG pro que nos esta ayudando a aprovechar la beca de Google for Non Profits y Adgrants. Teníamos un problema con nuestro usuario de ads de Google y ellos lo han resuelto. Los recomiendo ampliamente.",
    avatar: "/images/avatars/avatar2.jpg",
  },
  {
    id: 3,
    name: "Galiclown",
    role: "",
    content:
      "Genial el trabajo con ellos. Lo ponen todo muy fácil guiando paso a paso y con mucha paciencia con los inexpertos. ",
    avatar: "/images/avatars/avatar3.jpg",
  },
  {
    id: 4,
    name: "Olas del Alma ARG",
    role: "",
    content:
      "Muchas Gracias a todo el equipo por el apoyo, y compartir las herramientas, super práctico muy eficiente! Gracias por la Asistencia.",
    avatar: "/images/avatars/avatar4.jpg",
  },
  {
    id: 5,
    name: "Hortensia López Almán",
    role: "",
    content:
      "Gracias por el trabajo que hacen con tanto cariño e interés por ayudar a las ONGs.",
    avatar: "/images/avatars/avatar4.jpg",
  },
  {
    id: 6,
    name: "Carlos Rattia",
    role: "",
    content:
      "No tuve la oportunidad de contratarlos pero me ofrecieron paquetes muy atractivos y muy completos, se nota seriedad y compromiso al conversar con ellos, mejorar los tiempos de respuesta, suele tardar un poco el poder contactarlos",
    avatar: "/images/avatars/avatar4.jpg",
  },
  {
    id: 8,
    name: "Ricardo S",
    role: "",
    content:
      "Trabajar con PLAYFUL AGENCY en la obtención de la beca Google Ad Grants ha sido una experiencia realmente efectiva y gratificante. Desde el primer momento, se hicieron cargo del proceso con una velocidad y diligencia que superaron nuestras expectativas.No solo nos guiaron por los entresijos de la solicitud, sino que además aseguraron que todo se ejecutara de forma rápida y sin problemas, lo que resultó en la concesión de la beca. Estamos emocionados por el impacto que los 10,000 dólares mensuales en publicidad puedan tener en nuestros proyectos. Aunque es demasiado pronto para medir los resultados exactos, la perspectiva de lo que esto podría significar para la Fundación Maniapure nos llena de ilusión. En resumen, nuestra experiencia con PLAYFUL AGENCY ha sido altamente positiva y esperamos ver los frutos de esta colaboración en los próximos meses.",
    avatar: "/images/avatars/avatar4.jpg",
  },
  {
    id: 9,
    name: "Johann G",
    role: "",
    content:
      "Strong knowledge on SEO and Web Services. Highly recommended",
    avatar: "/images/avatars/avatar4.jpg",
  },
  {
    id: 10,
    name: "Varenka Leon",
    role: "",
    content:
      "Excelente servicio! Los contraté para servicio de auditoría de página web. Me brindaron todos los detalles necesarios y su atención fue maravillosa, estudio exhaustivo y entendible. Los recomiendo 100% avanzaré en otros servios que ofrecen para optimizar el SEO.",
    avatar: "/images/avatars/avatar4.jpg",
  },
  {
    id: 11,
    name: "Integrademy Hola",
    role: "",
    content:
      "Contactar con el equipo de Playful Agency ha sido gratificante por las informaciones de valor que han compartido, fueron encuentros donde sé mucha información de valor y definitivamente estamos encantados de trabajar junto. La profesionalidad y la paciencia para explicarnos cada detalle de la auditoría ha sido verdaderamente gratificante para nosotros. Gracias José y Laquesis por el trato y sacarnos tiempo de su agenda.",
    avatar: "/images/avatars/avatar4.jpg",
  },
  {
    id: 12,
    name: "Citas Ytramites",
    role: "",
    content:
      "Buen Servicio me dieron buena AUDITORIA a mi web en espera de finiquitar un préstamo para que me ayuden con mi Pagina.",
    avatar: "/images/avatars/avatar4.jpg",
  },
  {
    id: 13,
    name: "Norma Pacheco",
    role: "",
    content:
      "Al solicitar información acerca de los servicios de Playful Agency, para mejorar mi sitio web, así como lo relacionado con el tema de Email marketing, tuve el privilegio de ser atendida por Jose y Laquesis, representantes de la agencia, quienes me concedieron un espacio de su agenda para explicarme con detalles el alcance de la auditoría SEO que realizaron a mi página, así como recomendaciones y sugerencias que me podría ayudar con el crecimiento de mi negocio inmobiliario. Me explicaron con detalles el resultado de la auditoría efectuada y las sugerencias para mejorar y ampliar la visibilidad de mi página web. Son una empresa muy profesional con un excelente manejo de las herramientas digitales y fundamentalmente la atención personalizada con sus clientes. Playful... !!Super recomendada !! Cinco estrellas.",
    avatar: "/images/avatars/avatar4.jpg",
  },
];

const partnerLogos = [
  "/images/logos/soytechno.png",
  "/images/logos/acute-air.png",
  "/images/logos/one-world-rescue.png",
  "/images/logos/aitheras.png",
  "/images/logos/mercantil.png",
  "/images/logos/venezolano.png",
  "/images/logos/venemergencia.png",
];

interface TestimonialsSectionProps {
  textColor?: string;
  className?: string;
}

export default function TestimonialsSection({
  textColor = "#4A4453",
  className,
}: TestimonialsSectionProps) {
  const textStyle: React.CSSProperties = { color: textColor };

  return (
    <section className={className}>
      <div className="w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-normal mb-4" style={textStyle}>
            Lo que nuestros clientes dicen
          </h2>
          <p className="text-lg mb-12 max-w-3xl mx-auto" style={textStyle}>
            {publicFrontendCopy.caseStudiesIndex.testimonialsIntro}
          </p>
        </div>

        {/* Carrusel de testimonios */}
        <div className="w-full overflow-hidden pb-12">
          <div className="max-w-[1200px] mx-auto px-4">
            <Swiper
              modules={[Pagination, Autoplay]}
              slidesPerView={1}
              spaceBetween={20}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              breakpoints={{
                768: {
                  slidesPerView: 2,
                  spaceBetween: 24,
                },
              }}
              className="testimonials-swiper"
            >
              {testimonials.map((testimonial) => (
                <SwiperSlide key={testimonial.id}>
                  <div className="bg-white rounded-3xl shadow-lg overflow-hidden w-full h-[650px] flex flex-col justify-center items-center text-center p-3 md:p-8">
                    <div className="w-20 h-20 relative mb-4">
                      <Image
                        src="/images/avatar-playful.svg"
                        alt="Avatar Playful"
                        fill
                        className="object-contain"
                      />
                    </div>

                    <h4 className="font-semibold text-lg mb-2" style={textStyle}>
                      {testimonial.name}
                    </h4>

                    <div className="flex justify-center mb-4">
                      <div className="text-yellow-400 text-xl">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </div>
                    </div>

                    <p className="flex-grow flex items-center text-sm md:text-base px-2">
                      "{testimonial.content}"
                    </p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        {/* Logos */}
        <div className="py-16">
          <h3 className="text-center text-2xl md:text-3xl font-normal mb-12" style={textStyle}>
            Nuestros aliados estratégicos
          </h3>

          <div className="w-full max-w-[1200px] mx-auto px-4 pb-12">
            <Swiper
              modules={[Pagination, Autoplay]}
              slidesPerView={1}
              spaceBetween={20}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              autoplay={{
                delay: 2000,
                disableOnInteraction: false,
              }}
              breakpoints={{
                480: {
                  slidesPerView: 2,
                  spaceBetween: 16,
                },
                640: {
                  slidesPerView: 3,
                  spaceBetween: 20,
                },
                768: {
                  slidesPerView: 4,
                  spaceBetween: 24,
                },
              }}
              className="logos-swiper"
            >
              {partnerLogos.map((logo, index) => (
                <SwiperSlide key={logo}>
                  <div className="w-full h-[200px] flex items-center justify-center p-4">
                    <div className="w-full h-full relative">
                      <Image
                        src={logo}
                        alt={`Logo ${logo.split("/").pop()?.split(".")[0]}`}
                        fill
                        sizes="(max-width: 768px) 90vw, (max-width: 1024px) 40vw, 25vw"
                        className="object-contain"
                        priority={index < 2}
                      />
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
}
