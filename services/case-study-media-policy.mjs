const WORDPRESS_ENDPOINT_HOST = 'endpoint.playfulagency.com';
const WORDPRESS_UPLOADS_PATH = '/wp-content/uploads/';

export function isAllowedCaseStudyMediaUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === WORDPRESS_ENDPOINT_HOST &&
      url.port === '' &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith(WORDPRESS_UPLOADS_PATH)
    );
  } catch {
    return false;
  }
}

export function preserveFeaturedMediaUrl(source, sanitized) {
  const featuredMedia = source?._embedded?.['wp:featuredmedia'];
  const firstMedia = Array.isArray(featuredMedia) ? featuredMedia[0] : undefined;
  const sourceUrl = firstMedia?.source_url;

  if (!isAllowedCaseStudyMediaUrl(sourceUrl)) return sanitized;

  return {
    ...sanitized,
    featured_media_url: sourceUrl,
  };
}
