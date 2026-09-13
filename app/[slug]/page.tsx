import { notFound } from 'next/navigation';
import { canonicalForPath } from '@/utils/canonical';
import { getPageBySlug, getPageMetadataBySlug } from '@/services/wordpress';
import { applyPageTitleOverride, applyPageDescriptionOverride } from '@/utils/page-seo-overrides.mjs';
import ElementorPageContent from '@/components/ElementorPageContent';

export const revalidate = 300;
export const dynamicParams = true;

const SERVICE_SLUGS = [
  'agencia-seo',
  'agencia-sem',
  'agencia-diseno-web',
  'agencia-e-commerce',
  'marketing-internacional',
  'agencia-ux-ui',
  'seo-expertos',
  'seo-vigo',
];

export async function generateStaticParams() {
  return SERVICE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  const slug = resolved.slug;
  const url = canonicalForPath(`/${slug}`);
  const metadata = await getPageMetadataBySlug(slug);
  const { title, ogTitle } = applyPageTitleOverride(
    slug,
    metadata.yoast_wpseo_title,
    metadata.yoast_wpseo_og_title,
  );
  const { description, ogDescription } = applyPageDescriptionOverride(
    slug,
    metadata.yoast_wpseo_metadesc,
    metadata.yoast_wpseo_og_description,
  );
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(slug === 'gracias' ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      images: metadata.yoast_wpseo_og_image ? [metadata.yoast_wpseo_og_image] : undefined,
    },
  };
}

export default async function WordPressPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <ElementorPageContent
      html={page.html}
      pageId={page.id}
      stylesheetIds={page.stylesheetIds}
      slug={slug}
    />
  );
}
