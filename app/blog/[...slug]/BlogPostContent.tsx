import type { ReactNode } from 'react';

export function BlogPostContent({ children }: { children: ReactNode }) {
  // El artículo debe estar en el HTML inicial, sin esperar JavaScript ni imágenes.
  return <>{children}</>;
}
