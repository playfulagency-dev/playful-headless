import { getPageMetadataBySlug } from '@/services/wordpress';
import { canonicalForPath } from '@/utils/canonical';
import CaseStudiesContent from './CaseStudiesContent';
import publicFrontendCopy from '@/utils/public-frontend-copy.json';

export default function CaseStudiesPage() {
  return (
    <>
      <h1 className="sr-only">{publicFrontendCopy.caseStudiesIndex.title}</h1>
      <CaseStudiesContent />
    </>
  );
}

export async function generateMetadata() {
  const url = canonicalForPath('/casos-de-exito-agencia-de-marketing-digital');
  try {
    const metadata = await getPageMetadataBySlug('casos-de-exito-agencia-de-marketing-digital');
    
    return {
      title: metadata.yoast_wpseo_title || publicFrontendCopy.caseStudiesIndex.metadataTitle,
      description: metadata.yoast_wpseo_metadesc || publicFrontendCopy.caseStudiesIndex.metadataDescription,
      alternates: { canonical: url },
      openGraph: {
        title: metadata.yoast_wpseo_og_title || publicFrontendCopy.caseStudiesIndex.metadataTitle,
        description: metadata.yoast_wpseo_og_description || metadata.yoast_wpseo_metadesc || publicFrontendCopy.caseStudiesIndex.metadataDescription,
        type: 'website',
        url,
        images: metadata.yoast_wpseo_og_image ? [{
          url: metadata.yoast_wpseo_og_image,
          width: 1200,
          height: 630,
          alt: 'Casos de Éxito - Playful Agency',
        }] : [],
      },
    };
  } catch (error) {
    console.error('Error al generar metadatos de la página de casos de éxito:', error);
    return {
      title: publicFrontendCopy.caseStudiesIndex.metadataTitle,
      description: publicFrontendCopy.caseStudiesIndex.metadataDescription,
      alternates: { canonical: url },
      openGraph: { url },
    };
  }
}
