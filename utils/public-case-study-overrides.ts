import publicCaseStudyOverridesData from './public-case-study-overrides.json';

type CaseStudyRecord = {
  slug?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
  acf?: Record<string, unknown>;
};

type PublicCaseStudyOverride = {
  title: string;
  summary: string;
  acf: Record<string, unknown>;
};

export const PUBLIC_CASE_STUDY_OVERRIDES: Record<string, PublicCaseStudyOverride> =
  publicCaseStudyOverridesData;

export function getPublicCaseStudySeoOverride(slug: string) {
  const override = PUBLIC_CASE_STUDY_OVERRIDES[slug];
  if (!override) return undefined;

  return {
    title: override.title,
    description: override.summary,
  };
}

export function applyPublicCaseStudyOverrides<T extends CaseStudyRecord>(story: T): T {
  const override = story.slug ? PUBLIC_CASE_STUDY_OVERRIDES[story.slug] : undefined;
  if (!override) return story;

  return {
    ...story,
    title: {
      ...story.title,
      rendered: override.title,
    },
    content: {
      ...story.content,
      rendered: `<p>${override.summary}</p>`,
    },
    acf: {
      ...story.acf,
      ...override.acf,
    },
  } as T;
}
