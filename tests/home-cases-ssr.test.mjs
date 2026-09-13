import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { load } from 'cheerio';
import * as mediaPolicy from '../services/case-study-media-policy.mjs';

const require = createRequire(import.meta.url);

// Execute the actual TSX with real React, Next Link and Slick; only CSS is omitted.
function compile(relativePath, overrides = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (name) => name.endsWith('.css') ? {} : overrides[name] ?? require(name),
    module,
    module.exports,
  );
  return module.exports;
}

const hook = compile('../hooks/useSliderSettings.ts');
const { default: CarouselResultados } = compile('../components/CarouselResultados.tsx', {
  '../hooks/useSliderSettings': hook,
  '../services/case-study-media-policy.mjs': mediaPolicy,
});
const rawCases = ['Jumex', 'Odwalla'].map((name, index) => ({
  id: index + 1,
  title: { rendered: name },
  slug: `${name.toLowerCase()}-shopify-dtc-ecommerce`,
  excerpt: { rendered: `<p>${name} &amp; Shopify</p>` },
  acf: { tags: ['Shopify'], badge: 'Caso de éxito', button_text: 'Ver caso' },
  featured_media_url: `https://endpoint.playfulagency.com/wp-content/uploads/2026/09/${name.toLowerCase()}.png`,
}));

test('initial server HTML contains both supplied case cards, links, copy and visible images', () => {
  const html = renderToString(React.createElement(CarouselResultados, { casosDeExito: rawCases }));
  const $ = load(html);
  assert.doesNotMatch(html, /Cargando casos|opacity-0/);
  assert.equal($('.conversion-cards-wrapper a').length, 2);
  for (const item of rawCases) {
    const card = $(`a[href="/casos-de-exito/${item.slug}"]`);
    assert.equal(card.length, 1);
    assert.equal(card.find('h3').text(), item.title.rendered);
    assert.equal(card.find('p').text(), `${item.title.rendered} & Shopify`);
    assert.equal(card.find('img').attr('src'), item.featured_media_url);
    assert.equal(card.find('button').text(), 'Ver caso');
  }
});

test('initial HTML still rejects legacy and non-allowlisted media', () => {
  const cases = rawCases.map((item) => ({
    ...item,
    featured_media_url: 'https://evil.example/case.png',
    acf: { ...item.acf, imagen_destacada: item.featured_media_url },
  }));
  const $ = load(renderToString(React.createElement(CarouselResultados, { casosDeExito: cases })));
  assert.equal($('.conversion-cards-wrapper img').length, 0);
  assert.equal($('.conversion-cards-wrapper a').length, 2);
});

test('pretransformed cases are present in server HTML and keep precedence', () => {
  const cases = [{ id: 10, title: 'Provided case', slug: 'provided', description: 'Provided copy', categories: [], badge: '', badgeColor: '', buttonText: 'Open', buttonColor: '', image: '' }];
  const $ = load(renderToString(React.createElement(CarouselResultados, { cases, casosDeExito: rawCases })));
  assert.equal($('.conversion-cards-wrapper a').length, 1);
  assert.equal($('a[href="/casos-de-exito/provided"] h3').text(), 'Provided case');
});

// A persistent hook harness exercises prop changes and asynchronous effect cleanup
// without adding a DOM/test-renderer dependency. SSR tests above use real React hooks.
function createRerenderHarness(getAllCaseStudies = async () => []) {
  const states = [];
  const effects = [];
  let cursor = 0;
  let pending = [];
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (value) => { states[index] = value; }];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!effects[index] || dependencies.some((value, i) => !Object.is(value, effects[index].dependencies[i]))) {
        pending.push(() => {
          effects[index]?.cleanup?.();
          effects[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  const { default: Component } = compile('../components/CarouselResultados.tsx', {
    react: hooks,
    '../hooks/useSliderSettings': { useSliderSettings: () => ({ slidesToShow: 3 }) },
    '../services/case-study-media-policy.mjs': mediaPolicy,
    '@/services/wordpress': { getAllCaseStudies },
  });
  return (props) => {
    cursor = 0;
    pending = [];
    const tree = Component(props);
    const cards = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (node.props?.caseStudy) cards.push(node.props.caseStudy);
      visit(node.props?.children);
    }
    visit(tree);
    pending.forEach((effect) => effect());
    return cards;
  };
}

test('rerender immediately reflects updated raw and pretransformed props', () => {
  const render = createRerenderHarness();
  assert.deepEqual(render({ casosDeExito: rawCases }).map((item) => item.title), ['Jumex', 'Odwalla']);
  assert.deepEqual(render({ casosDeExito: [rawCases[1]] }).map((item) => item.title), ['Odwalla']);
  const supplied = { id: 3, title: 'Updated', slug: 'updated', categories: [], image: '' };
  assert.deepEqual(render({ cases: [supplied], casosDeExito: rawCases }), [supplied]);
  assert.deepEqual(render({ cases: [{ ...supplied, title: 'Updated again' }] }).map((item) => item.title), ['Updated again']);
});

test('late fetch cannot replace supplied props and fresh default arrays do not refetch', async () => {
  let resolveFetch;
  let requests = 0;
  const render = createRerenderHarness(() => {
    requests++;
    return new Promise((resolve) => { resolveFetch = resolve; });
  });
  render({});
  await new Promise(setImmediate);
  render({});
  assert.equal(requests, 1);
  assert.equal(render({ casosDeExito: rawCases }).length, 2);
  resolveFetch([{ ...rawCases[0], title: { rendered: 'Stale response' } }]);
  await new Promise(setImmediate);
  assert.deepEqual(render({ casosDeExito: rawCases }).map((item) => item.title), ['Jumex', 'Odwalla']);
  assert.deepEqual(render({}), []);
  await new Promise(setImmediate);
  assert.equal(requests, 2);
  resolveFetch([rawCases[1]]);
  await new Promise(setImmediate);
  assert.deepEqual(render({}).map((item) => item.title), ['Odwalla']);
});
