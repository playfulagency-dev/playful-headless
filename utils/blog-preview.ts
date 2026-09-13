import type { WPPost } from '@/services/wordpress';
import { blogPostPath } from './blog-url.ts';

/** Only data consumed by the interactive MostViewedArticles cards. */
export interface BlogPreview {
  id: number;
  date: string;
  title: string;
  href: string;
  featured_media_url?: string;
  featured_media_alt?: string;
}

// Project on the server: full article bodies and WordPress embeds never need
// to cross this client boundary. Keep every post in its existing order.
export function toBlogPreview(post: WPPost): BlogPreview {
  return {
    id: post.id,
    date: post.date,
    title: post.title.rendered,
    href: blogPostPath(post),
    featured_media_url: post.featured_media_url,
    featured_media_alt: post.featured_media_alt,
  };
}
