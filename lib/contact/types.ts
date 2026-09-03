export const CONTACT_FORM_ID = 'website-contact';

export const ATTRIBUTION_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type UtmField = (typeof ATTRIBUTION_FIELDS)[number];

export const DECISION_ROLE_OPTIONS = [
  'owner',
  'decision_lead',
  'researching_for_other',
  'other',
] as const;

export const SALES_MODEL_OPTIONS = [
  'd2c',
  'd2c_b2b',
  'amazon',
  'mercado_libre',
  'marketplaces_other',
  'marketplace_to_d2c',
  'pre_d2c',
  'not_online_or_unsure',
  'other',
] as const;

export const MONTHLY_REVENUE_OPTIONS = [
  'over_100k',
  '50k_100k',
  '10k_50k',
  'under_10k',
  'prefer_not_to_say',
  'other',
] as const;

export const PROJECT_TIMING_OPTIONS = [
  '0_30_days',
  '1_3_months',
  'evaluating',
  'researching',
  'other',
] as const;

export type DecisionRole = (typeof DECISION_ROLE_OPTIONS)[number];
export type SalesModel = (typeof SALES_MODEL_OPTIONS)[number];
export type MonthlyRevenue = (typeof MONTHLY_REVENUE_OPTIONS)[number];
export type ProjectTiming = (typeof PROJECT_TIMING_OPTIONS)[number];

export interface LeadQualification {
  decisionRole: DecisionRole;
  decisionRoleOther: string;
  salesModel: SalesModel;
  salesModelOther: string;
  secondaryMarketplaces: string;
  monthlyRevenue: MonthlyRevenue;
  monthlyRevenueOther: string;
  projectTiming: ProjectTiming;
  projectTimingOther: string;
}

export interface ContactAttribution {
  source: string;
  landing: string;
  formId: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}

export interface WebsiteLead {
  submissionId: string;
  name: string;
  email: string;
  phone: string;
  business: string;
  message: string;
  qualification: LeadQualification;
  privacyConsent: true;
  marketingConsent: boolean;
  consentCapturedAt: string;
  originalAttribution: ContactAttribution;
  recentAttribution: ContactAttribution;
}

export type LeadProcessingResult =
  | {
    deliveryStatus: 'confirmed';
    delivered: true;
    crmSynced: boolean;
    dryRun: boolean;
    replayed: boolean;
  }
  | {
    deliveryStatus: 'pending_confirmation';
    delivered: false;
    crmSynced: false;
    dryRun: boolean;
    replayed: boolean;
  };
