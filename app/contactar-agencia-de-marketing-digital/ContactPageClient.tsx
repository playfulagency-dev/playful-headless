'use client';

import { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import CarouselResultados from '@/components/CarouselResultados';
import BlogRelatedPostsSection from '@/components/sections/BlogRelatedPostsSection';
import TwoColumnCtaSection from '@/components/ui/TwoColumnCtaSection';
import {
  clearSubmissionId,
  getSubmissionAttribution,
  getOrCreateSubmissionId,
} from '@/lib/contact/client-attribution';
import { pushGenerateLead } from '@/lib/contact/analytics';

interface ContactPageClientProps {
  casosDeExito: any[];
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  business: '',
  decisionRole: '',
  decisionRoleOther: '',
  salesModel: '',
  salesModelOther: '',
  secondaryMarketplaces: '',
  monthlyRevenue: '',
  monthlyRevenueOther: '',
  projectTiming: '',
  projectTimingOther: '',
  message: '',
};

const MARKETPLACE_MODELS = new Set(['amazon', 'mercado_libre', 'marketplaces_other', 'marketplace_to_d2c']);

// Componente del formulario con reCAPTCHA V2
function ContactForm({ casosDeExito }: ContactPageClientProps) {
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const submissionIdRef = useRef('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    success: boolean;
    pending?: boolean;
    message: string;
  } | null>(null);
  const isPendingConfirmation = submitStatus?.pending === true;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetConfirmedForm = () => {
    setFormData(EMPTY_FORM);
    setPrivacyConsent(false);
    setMarketingConsent(false);
    submissionIdRef.current = '';
    clearSubmissionId();
    recaptchaRef.current?.reset();
  };

  const submitRequest = async (submissionAction: 'submit' | 'reconcile') => {
    // Obtener token de reCAPTCHA V2
    const recaptchaToken = recaptchaRef.current?.getValue();
    
    if (!recaptchaToken) {
      setSubmitStatus({
        success: false,
        pending: submissionAction === 'reconcile',
        message: 'Por favor, completa el reCAPTCHA antes de enviar el formulario.'
      });
      return;
    }

    setIsSubmitting(true);
    if (submissionAction === 'submit') {
      setSubmitStatus(null);
    } else {
      setSubmitStatus((current) => ({
        success: false,
        pending: true,
        message: current?.message || 'Comprobando el estado de la entrega…',
      }));
    }

    try {

      if (!submissionIdRef.current) submissionIdRef.current = getOrCreateSubmissionId();
      const attribution = getSubmissionAttribution();

      // Enviar el formulario a nuestra API con el token. El identificador se
      // conserva durante reintentos para impedir una segunda oportunidad.
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
          decisionRole: formData.decisionRole,
          decisionRoleOther: formData.decisionRoleOther,
          salesModel: formData.salesModel,
          salesModelOther: formData.salesModelOther,
          secondaryMarketplaces: formData.secondaryMarketplaces,
          monthlyRevenue: formData.monthlyRevenue,
          monthlyRevenueOther: formData.monthlyRevenueOther,
          projectTiming: formData.projectTiming,
          projectTimingOther: formData.projectTimingOther,
          message: formData.message,
          submissionId: submissionIdRef.current,
          privacyConsent,
          marketingConsent,
          submissionAction,
          ...attribution,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (response.status === 202 && data.pendingConfirmation === true) {
        setSubmitStatus({
          success: false,
          pending: true,
          message: data.message,
        });
        // Keep the original values locked for an explicit receipt check. The
        // consumed challenge is refreshed, but no request is sent automatically.
        recaptchaRef.current?.reset();
      } else if (response.ok && data.success) {
        if (data.analytics?.generateLead === true && typeof data.analytics.formId === 'string') {
          pushGenerateLead(data.analytics.formId);
        }
        setSubmitStatus({
          success: true,
          message: data.message || '¡Mensaje enviado con éxito! Nos pondremos en contacto contigo lo antes posible.'
        });
        
        resetConfirmedForm();
      } else {
        setSubmitStatus({
          success: false,
          pending: submissionAction === 'reconcile'
            || data.startNewSubmission === true
            || data.retryable === true,
          message: data.message || 'Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.'
        });
        // A deterministic rejection consumed the verifier token. Give the
        // user a fresh challenge for a corrected manual attempt while keeping
        // the stable submission id; this never triggers an automatic resend.
        recaptchaRef.current?.reset();
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setSubmitStatus({
        success: false,
        pending: true,
        message: 'No pudimos confirmar la respuesta. Comprueba el estado antes de iniciar otra solicitud.'
      });
      recaptchaRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPendingConfirmation) return;
    await submitRequest('submit');
  };

  const handleReceiptCheck = async () => {
    if (!isPendingConfirmation || isSubmitting) return;
    await submitRequest('reconcile');
  };

  const startDifferentSubmission = () => {
    resetConfirmedForm();
    setSubmitStatus(null);
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
              <div className={`mb-6 p-4 rounded-lg ${
                submitStatus.pending
                  ? 'bg-amber-100 text-amber-900'
                  : submitStatus.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
              }`}>
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
                    disabled={isPendingConfirmation || isSubmitting}
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
                    disabled={isPendingConfirmation || isSubmitting}
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
                    disabled={isPendingConfirmation || isSubmitting}
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
                  disabled={isPendingConfirmation || isSubmitting}
                  placeholder="Y... el nombre de tu empresa"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="decisionRole" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                  Tu papel en el proyecto <span className="text-red-500">*</span>
                </label>
                <select
                  id="decisionRole"
                  name="decisionRole"
                  value={formData.decisionRole}
                  onChange={handleChange}
                  disabled={isPendingConfirmation || isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="owner">Soy dueño/a, socio/a o cofundador/a</option>
                  <option value="decision_lead">Lidero e-commerce, marketing u operaciones y participo en la decisión</option>
                  <option value="researching_for_other">Estoy investigando para otra persona/equipo</option>
                  <option value="other">Otro</option>
                </select>
                {formData.decisionRole === 'other' && (
                  <input
                    type="text"
                    name="decisionRoleOther"
                    value={formData.decisionRoleOther}
                    onChange={handleChange}
                    disabled={isPendingConfirmation || isSubmitting}
                    placeholder="Cuéntanos cuál aplica"
                    className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={250}
                    required
                  />
                )}
              </div>

              <div>
                <label htmlFor="salesModel" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                  Modelo de venta principal <span className="text-red-500">*</span>
                </label>
                <select
                  id="salesModel"
                  name="salesModel"
                  value={formData.salesModel}
                  onChange={handleChange}
                  disabled={isPendingConfirmation || isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="d2c">Vendemos principalmente D2C desde nuestra tienda online</option>
                  <option value="d2c_b2b">Combinamos D2C y B2B</option>
                  <option value="amazon">Vendemos principalmente en Amazon</option>
                  <option value="mercado_libre">Vendemos principalmente en Mercado Libre</option>
                  <option value="marketplaces_other">Vendemos principalmente en otros marketplaces</option>
                  <option value="marketplace_to_d2c">Vendemos en marketplaces y queremos dar el salto a D2C</option>
                  <option value="pre_d2c">Estamos preparando nuestra primera venta directa D2C</option>
                  <option value="not_online_or_unsure">No vendemos online todavía / no estoy seguro</option>
                  <option value="other">Otro</option>
                </select>
                {formData.salesModel === 'other' && (
                  <input
                    type="text"
                    name="salesModelOther"
                    value={formData.salesModelOther}
                    onChange={handleChange}
                    disabled={isPendingConfirmation || isSubmitting}
                    placeholder="Cuéntanos cuál aplica"
                    className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={250}
                    required
                  />
                )}
                {MARKETPLACE_MODELS.has(formData.salesModel) && (
                  <input
                    type="text"
                    name="secondaryMarketplaces"
                    value={formData.secondaryMarketplaces}
                    onChange={handleChange}
                    disabled={isPendingConfirmation || isSubmitting}
                    placeholder="¿En qué otros marketplaces vendes? (opcional)"
                    className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={250}
                  />
                )}
              </div>

              <div>
                <label htmlFor="monthlyRevenue" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                  Facturación mensual online aproximada <span className="text-red-500">*</span>
                </label>
                <select
                  id="monthlyRevenue"
                  name="monthlyRevenue"
                  value={formData.monthlyRevenue}
                  onChange={handleChange}
                  disabled={isPendingConfirmation || isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="over_100k">Más de US$100.000</option>
                  <option value="50k_100k">US$50.000–100.000</option>
                  <option value="10k_50k">US$10.000–50.000</option>
                  <option value="under_10k">Menos de US$10.000</option>
                  <option value="prefer_not_to_say">Prefiero no compartirlo</option>
                  <option value="other">Otro</option>
                </select>
                {formData.monthlyRevenue === 'other' && (
                  <input
                    type="text"
                    name="monthlyRevenueOther"
                    value={formData.monthlyRevenueOther}
                    onChange={handleChange}
                    disabled={isPendingConfirmation || isSubmitting}
                    placeholder="Cuéntanos cuál aplica"
                    className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={250}
                    required
                  />
                )}
              </div>

              <div>
                <label htmlFor="projectTiming" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                  Momento del proyecto <span className="text-red-500">*</span>
                </label>
                <select
                  id="projectTiming"
                  name="projectTiming"
                  value={formData.projectTiming}
                  onChange={handleChange}
                  disabled={isPendingConfirmation || isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="0_30_days">Quiero iniciar un proyecto en los próximos 30 días</option>
                  <option value="1_3_months">Estoy preparando un proyecto para los próximos 1–3 meses</option>
                  <option value="evaluating">Estoy evaluando opciones</option>
                  <option value="researching">Solo estoy investigando</option>
                  <option value="other">Otro</option>
                </select>
                {formData.projectTiming === 'other' && (
                  <input
                    type="text"
                    name="projectTimingOther"
                    value={formData.projectTimingOther}
                    onChange={handleChange}
                    disabled={isPendingConfirmation || isSubmitting}
                    placeholder="Cuéntanos cuál aplica"
                    className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={250}
                    required
                  />
                )}
              </div>
              
              <div>
                <label htmlFor="message" className="block [font-family:var(--font-dm-sans),sans-serif] font-bold text-[14px] leading-[130%] text-[#453A53] mb-1">
                  Cuéntanos brevemente qué quieres mejorar y qué esperas conseguir <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  disabled={isPendingConfirmation || isSubmitting}
                  placeholder="Por ejemplo: quiero vender directamente, mejorar conversión o migrar mi tienda"
                  maxLength={1000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                ></textarea>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 [font-family:var(--font-dm-sans),sans-serif] font-medium text-[12px] leading-[16px] tracking-[0.4px] text-[#453A53]">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(event) => setPrivacyConsent(event.target.checked)}
                    disabled={isPendingConfirmation || isSubmitting}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    required
                  />
                  <span>
                    Acepto el tratamiento de mis datos según la
                    <a href="/politica-de-privacidad" className="text-purple-700 font-semibold hover:underline ml-1">Política de Privacidad</a>
                  </span>
                </label>
                <label className="flex items-start gap-3 [font-family:var(--font-dm-sans),sans-serif] font-medium text-[12px] leading-[16px] tracking-[0.4px] text-[#453A53]">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(event) => setMarketingConsent(event.target.checked)}
                    disabled={isPendingConfirmation || isSubmitting}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>
                    Acepto recibir comunicaciones de marketing ocasionales. Puedo retirar este consentimiento en cualquier momento.
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
              
              {isPendingConfirmation ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleReceiptCheck}
                    disabled={isSubmitting}
                    className="w-full bg-[#39DDCB] hover:bg-[#0c8966] text-[#440099] font-semibold py-3 px-6 rounded-full shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Comprobando...' : 'Comprobar estado de la entrega'}
                  </button>
                  <button
                    type="button"
                    onClick={startDifferentSubmission}
                    disabled={isSubmitting}
                    className="w-full border border-[#440099] text-[#440099] font-semibold py-3 px-6 rounded-full disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Iniciar una solicitud distinta
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#39DDCB] hover:bg-[#0c8966] text-[#440099] font-semibold py-3 px-6 rounded-full shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Enviando...' : '¡Quiero que conozcan mi caso!'}
                  </button>
                </div>
              )}
              
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
          <CarouselResultados casosDeExito={casosDeExito} />
        </div>
      </section>

      {/* Secciones importadas desde Nosotros */}
      <BlogRelatedPostsSection />
      
      {/* CTA Section */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-8 mb-20">
        <TwoColumnCtaSection />
      </section>
    </main>
  );
}

// Componente principal
export default function ContactPageClient({ casosDeExito }: ContactPageClientProps) {
  return <ContactForm casosDeExito={casosDeExito} />;
}
