'use client';

import { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import CarouselResultados from '@/components/CarouselResultados';
import BlogRelatedPostsSection from '@/components/sections/BlogRelatedPostsSection';
import TwoColumnCtaSection from '@/components/ui/TwoColumnCtaSection';
import publicFrontendCopy from '@/utils/public-frontend-copy.json';

interface ContactPageClientProps {
  casosDeExito: any[];
}

// Componente del formulario con reCAPTCHA V2
function ContactForm({ casosDeExito }: ContactPageClientProps) {
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    business: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean, message: string} | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Obtener token de reCAPTCHA V2
    const recaptchaToken = recaptchaRef.current?.getValue();
    
    if (!recaptchaToken) {
      setSubmitStatus({
        success: false,
        message: 'Por favor, completa el reCAPTCHA antes de enviar el formulario.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {

      // Enviar el formulario a nuestra API con el token
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          business: formData.business,
          message: formData.message,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus({
          success: true,
          message: data.message || '¡Mensaje enviado con éxito! Nos pondremos en contacto contigo lo antes posible.'
        });
        
        // Limpiar el formulario y reCAPTCHA después de un envío exitoso
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          business: '',
          message: ''
        });
        recaptchaRef.current?.reset();
      } else {
        setSubmitStatus({
          success: false,
          message: data.message || 'Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.'
        });
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setSubmitStatus({
        success: false,
        message: 'Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.'
      });
      recaptchaRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-cover bg-center">
      {/* Sección principal con dos columnas según el diseño */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 pt-4 pb-12 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Columna Izquierda: textos e ilustración */}
          <div className="flex flex-col justify-center items-start text-left">
            <h1 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-normal text-[20px] text-[#453A53] mb-2">Playful Agency</h1>
            <h2 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[45px] leading-[52px] text-[#440099] mb-2">Hablemos de tu próximo proyecto</h2>
            <h3 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[28px] leading-[36px] text-[#453A53] mb-2">¡Explícanos tu caso!</h3>
            <p className="[font-family:var(--font-dm-sans),sans-serif] font-normal text-[16px] leading-[24px] text-[#4A4453] max-w-[600px]">
            ¿Tienes un proyecto en la mira o una pregunta técnica que necesita respuesta? Estamos listos para escuchar. Completa el formulario o escríbenos directamente. Analizaremos tu necesidad y nos pondremos en contacto contigo lo antes posible. <strong className="font-bold">Empecemos a planificar tus resultados.</strong>
            </p>
            <div className="mt-8 hidden lg:block">
              <img src="/images/contacto-imagen.png" alt="Ilustración de contacto" className="w-full max-w-[620px] h-auto object-contain" />
            </div>
          </div>

          {/* Columna Derecha: tarjeta de formulario */}
          <div className="bg-[#FF9294] rounded-[32px] shadow-xl p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="[font-family:var(--font-paytone-one),var(--font-montserrat),sans-serif] font-[700] text-[32px] leading-[40px] text-[#453A53] text-center w-[60%] mx-auto">Hablemos sobre tu Proyecto</h2>
            </div>

            {submitStatus && (
              <div className={`mb-6 p-4 rounded-lg ${submitStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {submitStatus.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 [font-family:var(--font-dm-sans),sans-serif]">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="name" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Déjanos aquí tu nombre"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Correo electrónico dónde te contactaremos"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="phone" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                    Número de teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Escribe también tu número de contacto"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="business" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                  Nombre de tu negocio
                </label>
                <input
                  type="text"
                  id="business"
                  name="business"
                  value={formData.business}
                  onChange={handleChange}
                  placeholder="Y... el nombre de tu empresa"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                  ¿Cómo podemos ayudarte? <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="¡Por último! Cuéntanos ¿Qué quieres lograr?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                ></textarea>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 [font-family:var(--font-dm-sans),sans-serif] font-medium text-[12px] leading-[16px] tracking-[0.4px] text-[#453A53]">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                  <span>
                    Entérate de cómo usamos tus datos en
                    <a href="/politica-de-privacidad" className="text-purple-700 font-semibold hover:underline ml-1">Política de Privacidad</a>
                  </span>
                </label>
                <label className="flex items-start gap-3 [font-family:var(--font-dm-sans),sans-serif] font-medium text-[12px] leading-[16px] tracking-[0.4px] text-[#453A53]">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                  <span>
                    Consiento recibir notificaciones, emails y alertas de Playful Agency, la recopilación de los mensajes, publicidad y valor.
                    Puedes administrar tus preferencias desde los mensajes.
                  </span>
                </label>
                <label className="flex items-start gap-3 [font-family:var(--font-dm-sans),sans-serif] font-medium text-[12px] leading-[16px] tracking-[0.4px] text-[#453A53]">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                  <span>
                    Acepto recibir mensajes de marketing ocasionales de Playful Agency.
                  </span>
                </label>
              </div>
              
              {/* reCAPTCHA V2 Checkbox */}
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                />
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#39DDCB] hover:bg-[#0c8966] text-[#440099] font-semibold py-3 px-6 rounded-full shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enviando...' : '¡Quiero que conozcan mi caso!'}
                </button>
              </div>
              
              <p className="text-sm text-[#4A4453]">
                Al hacer clic en "Enviar mensaje", aceptas nuestra Política de Privacidad y das tu consentimiento para que nos pongamos en contacto contigo.
              </p>
            </form>
          </div>
        </div>
      </section>
      
      {/* Sección Casos de Éxito - Carrusel */}
      <section className="py-12">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <CarouselResultados
            casosDeExito={casosDeExito}
            title={publicFrontendCopy.caseStudiesCarousel.title}
            subtitle={publicFrontendCopy.caseStudiesCarousel.subtitle}
            title2={publicFrontendCopy.caseStudiesCarousel.title2}
            buttonText={publicFrontendCopy.caseStudiesCarousel.buttonText}
          />
        </div>
      </section>

      {/* Secciones importadas desde Nosotros */}
      <BlogRelatedPostsSection />
      
      {/* CTA Section */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-8 mb-20">
        <TwoColumnCtaSection
          title={publicFrontendCopy.contact.cta.title}
          subtitle={publicFrontendCopy.contact.cta.subtitle}
          ctaTitle={publicFrontendCopy.contact.cta.ctaTitle}
        />
      </section>
    </main>
  );
}

// Componente principal
export default function ContactPageClient({ casosDeExito }: ContactPageClientProps) {
  return <ContactForm casosDeExito={casosDeExito} />;
}
