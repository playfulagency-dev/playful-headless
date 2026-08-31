import { notFound } from 'next/navigation';
import { canonicalForPath } from '@/utils/canonical';
import { getPageBySlug, getPageMetadataBySlug } from '@/services/wordpress';
import ElementorPageContent from '@/components/ElementorPageContent';
import {
  getWpDynamicRoutePolicy,
  getWpDynamicRouteRobots,
  WP_SERVICE_SLUGS,
} from '@/utils/wp-dynamic-route-governance.mjs';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return WP_SERVICE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  const slug = resolved.slug;
  const policy = getWpDynamicRoutePolicy(slug);
  if (!policy) notFound();
  const url = canonicalForPath(`/${slug}`);
  const metadata = await getPageMetadataBySlug(slug);
  const robots = getWpDynamicRouteRobots(policy);
  return {
    title: metadata.yoast_wpseo_title,
    description: metadata.yoast_wpseo_metadesc,
    alternates: { canonical: url },
    ...(robots ? { robots } : {}),
    openGraph: {
      title: metadata.yoast_wpseo_og_title || metadata.yoast_wpseo_title,
      description: metadata.yoast_wpseo_og_description || metadata.yoast_wpseo_metadesc,
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
  if (!getWpDynamicRoutePolicy(slug)) notFound();
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <ElementorPageContent
      html={page.html}
      pageId={page.id}
      stylesheetIds={page.stylesheetIds}
    />
  );
}
