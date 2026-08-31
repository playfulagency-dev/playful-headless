export type WpDynamicRouteKind = 'service' | 'auxiliary' | 'legacy';

export interface WpDynamicRoutePolicy {
  readonly kind: WpDynamicRouteKind;
  readonly indexable: boolean;
}

export const WP_SERVICE_SLUGS: readonly string[];
export const WP_AUXILIARY_SLUGS: readonly string[];
export const WP_LEGACY_SLUGS: readonly string[];
export const WP_GOVERNED_SLUGS: readonly string[];
export const WP_LEGACY_INDEXABLE_SLUGS_ENV: 'WP_LEGACY_INDEXABLE_SLUGS';

export function parseLegacyIndexableSlugs(value?: string): Set<string>;

export function getWpDynamicRoutePolicy(
  slug: string,
  options?: { legacyIndexableSlugs?: string },
): WpDynamicRoutePolicy | null;

export function getWpDynamicRouteRobots(
  policy: WpDynamicRoutePolicy | null,
): { index: false; follow: true } | undefined;
