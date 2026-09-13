import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ORGANIZATION_SCHEMA, ORGANIZATION_JSON_LD } from '../utils/organization-schema.mjs';

test('organization contains only verified identity, not commercial or legal claims', () => {
  assert.deepEqual(Object.keys(ORGANIZATION_SCHEMA).sort(), ['@context', '@type', '@id', 'name', 'url', 'logo'].sort());
  assert.equal(ORGANIZATION_SCHEMA['@type'], 'Organization');
  assert.equal(ORGANIZATION_SCHEMA.name, 'Playful Agency');
});

test('identity remains canonical across preview and production', () => {
  assert.equal(ORGANIZATION_SCHEMA['@context'], 'https://schema.org');
  assert.equal(ORGANIZATION_SCHEMA.url, 'https://playfulagency.com/');
  assert.equal(ORGANIZATION_SCHEMA['@id'], `${ORGANIZATION_SCHEMA.url}#organization`);
  assert.equal(new URL(ORGANIZATION_SCHEMA.logo).origin, new URL(ORGANIZATION_SCHEMA.url).origin);
});

test('serialized script is valid JSON and cannot contain HTML terminators', () => {
  assert.deepEqual(JSON.parse(ORGANIZATION_JSON_LD), ORGANIZATION_SCHEMA);
  assert.doesNotMatch(ORGANIZATION_JSON_LD, /</);
});

test('logo is the existing public header asset', () => {
  const header = readFileSync(new URL('../components/HeaderClient.tsx', import.meta.url), 'utf8');
  const path = new URL(ORGANIZATION_SCHEMA.logo).pathname;
  assert.ok(header.includes(path));
  const svg = readFileSync(new URL(`../public${path}`, import.meta.url), 'utf8');
  assert.match(svg, /viewBox="0 0 1057 250"/);
});

test('home emits the organization script once without client-only loading', () => {
  const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.equal((home.match(/id="playful-organization"/g) || []).length, 1);
  assert.match(home, /type="application\/ld\+json"/);
  assert.match(home, /__html: ORGANIZATION_JSON_LD/);
  assert.doesNotMatch(home, /^["']use client["']/);
});
