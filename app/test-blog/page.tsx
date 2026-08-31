import type { Metadata } from 'next';
import { canonicalForPath } from '@/utils/canonical';

const TEST_BLOG_URL = canonicalForPath('/test-blog');

export const metadata: Metadata = {
  alternates: { canonical: TEST_BLOG_URL },
  openGraph: { url: TEST_BLOG_URL },
  robots: { index: false, follow: true },
};

import { getBlogPostBySlug } from '@/services/wordpress';
import { notFound } from 'next/navigation';

export default async function TestBlogPage() {
  // Test with a known blog post slug
  const testSlug = 'tu-slug-de-prueba';
  console.log(`Testing blog post with slug: ${testSlug}`);
  
  try {
    const post = await getBlogPostBySlug(testSlug);
    
    if (!post) {
      console.error('No post found with slug:', testSlug);
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Test Blog Post</h1>
          <p className="text-red-500">No post found with slug: {testSlug}</p>
          <p className="mt-4">Check the console for more details.</p>
        </div>
      );
    }
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Blog Post</h1>
        <h2 className="text-xl font-semibold mb-4">{post.title?.rendered || 'No Title'}</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(post, null, 2)}
        </pre>
      </div>
    );
  } catch (error) {
    console.error('Error in TestBlogPage:', error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <pre className="text-red-500">{error instanceof Error ? error.message : 'Unknown error'}</pre>
      </div>
    );
  }
}
