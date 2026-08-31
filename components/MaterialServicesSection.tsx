import React from "react";
import Link from "next/link";
import Image from "next/image";
import publicFrontendCopy from "@/utils/public-frontend-copy.json";

const cardIcons = [
  "/images/diseno-confuso-obsoleto.png",
  "/images/velocidad-carga-lenta.png",
  "/images/errores-tecnicos-bugs.png",
];

const cardData = publicFrontendCopy.home.technicalReviewCards.map((card, index) => ({
  ...card,
  icon: cardIcons[index],
}));

export default function MaterialServicesSection({
  className,
}: {
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="playful-contenedor playful-contenedor-FFEFD1">
        <h2 className="playful-h2 max-w-3xl mx-auto">
          {publicFrontendCopy.home.technicalReviewTitle}
        </h2>
        <p className="playful-contenido-p max-w-3xl mx-auto">
          {publicFrontendCopy.home.technicalReviewIntro}
        </p>

        {/* Grid de 3 tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12">
          {cardData.map((card, index) => (
            <div
              key={index}
              className="conversion-card flex flex-col"
            >
              <div className="card-icon flex-shrink-0 mb-4 w-[200px] h-[200px] relative mx-auto">
                <Image
                  src={card.icon}
                  alt={card.title}
                  width={200}
                  height={200}
                  className="object-contain"
                />
              </div>
              <h3 className="playful-h3 flex-shrink-0 mb-3">{card.title}</h3>
              <p className="playful-contenido-p flex-1">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/contactar-agencia-de-marketing-digital" className="playful-boton !text-[14px] !leading-[18px] md:!text-base md:!leading-normal">
          Escríbenos para conversar sobre tu página web.
          </Link>
        </div>
      </div>
    </section>
  );
}
