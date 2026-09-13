import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);

// Compile the actual TSX so this exercises server rendering, without a Next
// build or WordPress/network access. Resolve the original loader too, allowing
// this regression test to reproduce the bug before the fix.
function loadTsx(path) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const localRequire = (specifier) => specifier.startsWith('@/')
    ? loadTsx(new URL(`../${specifier.slice(2)}.tsx`, import.meta.url))
    : require(specifier);
  new Function('require', 'module', 'exports', outputText)(
    localRequire, module, module.exports,
  );
  return module.exports;
}

const { BlogPostContent } = loadTsx(
  new URL('../app/blog/[...slug]/BlogPostContent.tsx', import.meta.url),
);

for (const [label, imageSrc] of [
  ['without a featured image', undefined],
  ['with a featured image', '/images/article-fixture.webp'],
  ['with an unavailable featured image', '/missing-article-image.webp'],
]) {
  test(`initial server HTML contains the complete article ${label}`, () => {
    const children = React.createElement('main', { className: 'detalle-blog-fondo' },
      React.createElement('header', null,
        React.createElement('h2', null, 'Artículo de prueba'),
        imageSrc ? React.createElement('img', {
          src: imageSrc, alt: 'Imagen del artículo', width: 800, height: 400,
        }) : null,
      ),
      React.createElement('article', null,
        React.createElement('h2', { id: 'contenido' }, 'Contenido del artículo'),
        React.createElement('p', null, 'El cuerpo debe estar disponible sin JavaScript.'),
        React.createElement('a', { href: '/agencia-shopify' }, 'Servicio Shopify'),
      ),
    );
    // Legacy props also exercise both branches of the old image gate. The
    // corrected wrapper needs only children; the image belongs to the page.
    const html = renderToStaticMarkup(React.createElement(BlogPostContent, {
      title: 'Artículo de prueba', featuredImage: imageSrc,
    }, children));

    assert.equal(html, renderToStaticMarkup(children));
    assert.doesNotMatch(html, /Cargando|fixed inset-0|display:\s*none/);
  });
}
