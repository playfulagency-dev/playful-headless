import {
  ATTRIBUTION_FIELDS,
  CONTACT_FORM_ID,
  DECISION_ROLE_OPTIONS,
  MONTHLY_REVENUE_OPTIONS,
  PROJECT_TIMING_OPTIONS,
  SALES_MODEL_OPTIONS,
  type ContactAttribution,
  type DecisionRole,
  type LeadQualification,
  type MonthlyRevenue,
  type ProjectTiming,
  type SalesModel,
  type WebsiteLead,
} from './types.ts';

export class SubmissionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubmissionValidationError';
  }
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\u0000/g, '').slice(0, maxLength);
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  const normalized = text(value, maxLength);
  if (!normalized) {
    throw new SubmissionValidationError(`Falta el campo requerido: ${field}.`);
  }
  return normalized;
}

function option<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  const normalized = requiredText(value, field, 80);
  if (!(allowed as readonly string[]).includes(normalized)) {
    throw new SubmissionValidationError(`El campo ${field} no contiene una opción válida.`);
  }
  return normalized as T;
}

function otherText(value: unknown, field: string, selected: string): string {
  const normalized = text(value, 250);
  if (selected === 'other' && !normalized) {
    throw new SubmissionValidationError(`Aclara el campo requerido: ${field}.`);
  }
  return selected === 'other' ? normalized : '';
}

function qualification(value: Record<string, unknown>): LeadQualification {
  const decisionRole = option<DecisionRole>(
    value.decisionRole,
    'decisionRole',
    DECISION_ROLE_OPTIONS,
  );
  const salesModel = option<SalesModel>(
    value.salesModel,
    'salesModel',
    SALES_MODEL_OPTIONS,
  );
  const monthlyRevenue = option<MonthlyRevenue>(
    value.monthlyRevenue,
    'monthlyRevenue',
    MONTHLY_REVENUE_OPTIONS,
  );
  const projectTiming = option<ProjectTiming>(
    value.projectTiming,
    'projectTiming',
    PROJECT_TIMING_OPTIONS,
  );
  const usesMarketplace = ['amazon', 'mercado_libre', 'marketplaces_other', 'marketplace_to_d2c']
    .includes(salesModel);

  return {
    decisionRole,
    decisionRoleOther: otherText(value.decisionRoleOther, 'decisionRoleOther', decisionRole),
    salesModel,
    salesModelOther: otherText(value.salesModelOther, 'salesModelOther', salesModel),
    secondaryMarketplaces: usesMarketplace ? text(value.secondaryMarketplaces, 250) : '',
    monthlyRevenue,
    monthlyRevenueOther: otherText(value.monthlyRevenueOther, 'monthlyRevenueOther', monthlyRevenue),
    projectTiming,
    projectTimingOther: otherText(value.projectTimingOther, 'projectTimingOther', projectTiming),
  };
}

function normalizeEmail(value: unknown): string {
  const email = requiredText(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SubmissionValidationError('El correo electrónico no es válido.');
  }
  return email;
}

function normalizePhone(value: unknown): string {
  const raw = text(value, 40);
  if (!raw) return '';
  const prefix = raw.startsWith('+') ? '+' : '';
  const digits = raw.replace(/\D/g, '').slice(0, 15);
  if (digits.length < 7) {
    throw new SubmissionValidationError('El teléfono no es válido.');
  }
  return `${prefix}${digits}`;
}

function normalizeSubmissionId(value: unknown): string {
  const id = requiredText(value, 'submissionId', 100);
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(id)) {
    throw new SubmissionValidationError('El identificador del envío no es válido.');
  }
  return id;
}

function normalizeLanding(value: unknown): string {
  const candidate = text(value, 500);
  if (!candidate) return '/';

  try {
    const parsed = new URL(candidate, 'https://playfulagency.com');
    return `${parsed.pathname}${parsed.search}`.slice(0, 500);
  } catch {
    return '/';
  }
}

function normalizeSource(value: unknown): string {
  const source = text(value, 100).toLowerCase();
  return source.replace(/[^a-z0-9._/-]/g, '-').replace(/-+/g, '-').slice(0, 100) || 'direct';
}

export function normalizeAttribution(value: unknown): ContactAttribution {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const attribution: ContactAttribution = {
    source: normalizeSource(input.source),
    landing: normalizeLanding(input.landing),
    formId: CONTACT_FORM_ID,
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
  };

  for (const field of ATTRIBUTION_FIELDS) {
    attribution[field] = text(input[field], 160);
  }

  return attribution;
}

export function normalizeWebsiteLead(value: unknown, now = new Date()): WebsiteLead {
  if (!value || typeof value !== 'object') {
    throw new SubmissionValidationError('El cuerpo del formulario no es válido.');
  }

  const input = value as Record<string, unknown>;
  if (input.privacyConsent !== true) {
    throw new SubmissionValidationError('Debes aceptar la Política de Privacidad.');
  }

  return {
    submissionId: normalizeSubmissionId(input.submissionId),
    name: requiredText(input.name, 'name', 120),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    business: text(input.business, 160),
    message: requiredText(input.message, 'message', 1000),
    qualification: qualification(input),
    privacyConsent: true,
    marketingConsent: input.marketingConsent === true,
    consentCapturedAt: now.toISOString(),
    originalAttribution: normalizeAttribution(input.originalAttribution),
    recentAttribution: normalizeAttribution(input.recentAttribution),
  };
}
