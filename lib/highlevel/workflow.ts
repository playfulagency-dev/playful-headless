import { createHash } from 'node:crypto';
import {
  type CrmSyncControl,
  RetainResourceLeaseError,
} from '../contact/orchestrator.ts';
import type { WebsiteLead } from '../contact/types.ts';
import type { EnabledHighLevelConfig, HighLevelCustomFieldKey } from './config.ts';
import type {
  HighLevelCustomFieldValue,
  HighLevelGateway,
  HighLevelOpportunity,
} from './client.ts';
import { HighLevelApiError } from './client.ts';

export class AmbiguousOpportunityError extends Error {
  constructor(public readonly count: number) {
    super(`El contacto ya tiene ${count} oportunidades abiertas en el pipeline canónico.`);
    this.name = 'AmbiguousOpportunityError';
  }
}

export interface CrmSyncResult {
  contactId: string;
  opportunityId?: string;
  opportunityCreated?: boolean;
  taskId?: string;
}

type QualificationLevel = 'priority' | 'transition' | 'review';

function qualificationLevel(lead: WebsiteLead): QualificationLevel {
  const qualification = lead.qualification;
  const isDecisionMaker = qualification.decisionRole === 'owner'
    || qualification.decisionRole === 'decision_lead';
  const isNearTerm = qualification.projectTiming === '0_30_days'
    || qualification.projectTiming === '1_3_months';
  const isDirectCommerce = qualification.salesModel === 'd2c'
    || qualification.salesModel === 'd2c_b2b'
    || qualification.salesModel === 'marketplace_to_d2c';

  if (isDecisionMaker && isNearTerm && isDirectCommerce
    && qualification.monthlyRevenue === 'over_100k') return 'priority';
  if (['amazon', 'mercado_libre', 'marketplaces_other', 'marketplace_to_d2c', 'pre_d2c']
    .includes(qualification.salesModel)) return 'transition';
  return 'review';
}

function field(
  config: EnabledHighLevelConfig,
  key: HighLevelCustomFieldKey,
  value: string | boolean,
): HighLevelCustomFieldValue {
  return { id: config.customFieldIds[key], fieldValue: String(value) };
}

function recentFields(lead: WebsiteLead, config: EnabledHighLevelConfig): HighLevelCustomFieldValue[] {
  const attribution = lead.recentAttribution;
  return [
    field(config, 'recent_source', attribution.source),
    field(config, 'recent_landing', attribution.landing),
    field(config, 'utm_source', attribution.utm_source),
    field(config, 'utm_medium', attribution.utm_medium),
    field(config, 'utm_campaign', attribution.utm_campaign),
    field(config, 'utm_term', attribution.utm_term),
    field(config, 'utm_content', attribution.utm_content),
    field(config, 'form_id', attribution.formId),
    field(config, 'privacy_consent_at', lead.consentCapturedAt),
    field(config, 'marketing_consent', lead.marketingConsent),
    field(config, 'decision_role', lead.qualification.decisionRole),
    field(config, 'decision_role_other', lead.qualification.decisionRoleOther),
    field(config, 'sales_model', lead.qualification.salesModel),
    field(config, 'sales_model_other', lead.qualification.salesModelOther),
    field(config, 'secondary_marketplaces', lead.qualification.secondaryMarketplaces),
    field(config, 'monthly_revenue', lead.qualification.monthlyRevenue),
    field(config, 'monthly_revenue_other', lead.qualification.monthlyRevenueOther),
    field(config, 'project_timing', lead.qualification.projectTiming),
    field(config, 'project_timing_other', lead.qualification.projectTimingOther),
    field(config, 'qualification_level', qualificationLevel(lead)),
    field(config, 'project_context', lead.message),
  ];
}

function originalFields(lead: WebsiteLead, config: EnabledHighLevelConfig): HighLevelCustomFieldValue[] {
  return [
    field(config, 'original_source', lead.originalAttribution.source),
    field(config, 'original_landing', lead.originalAttribution.landing),
  ];
}

function selectOrReject(opportunities: HighLevelOpportunity[]): HighLevelOpportunity | undefined {
  if (opportunities.length > 1) throw new AmbiguousOpportunityError(opportunities.length);
  return opportunities[0];
}

function isDeterministicWriteFailure(error: unknown): boolean {
  return error instanceof HighLevelApiError && error.status >= 400 && error.status < 500;
}

function retainLeaseForUncertainWrite(error: unknown): never {
  if (isDeterministicWriteFailure(error)) throw error;
  throw new RetainResourceLeaseError(error);
}

function localControl(lead: WebsiteLead): CrmSyncControl {
  const progress: CrmSyncControl['progress'] = {};
  return {
    submissionKey: createHash('sha256').update(lead.submissionId).digest('hex'),
    progress,
    checkpoint: async (patch) => { Object.assign(progress, patch); },
    withResourceLease: async (_resource, operation) => operation(),
  };
}

export async function syncWebsiteLeadToHighLevel(
  lead: WebsiteLead,
  gateway: HighLevelGateway,
  config: EnabledHighLevelConfig,
  now = new Date(),
  suppliedControl?: CrmSyncControl,
): Promise<CrmSyncResult> {
  const control = suppliedControl || localControl(lead);
  const fit = qualificationLevel(lead);
  let contactId = control.progress.contactId;

  if (!contactId) {
    const contact = await gateway.upsertContact({
      name: lead.name,
      email: lead.email,
      ...(lead.phone ? { phone: lead.phone } : {}),
      ...(lead.business ? { companyName: lead.business } : {}),
      locationId: config.locationId,
      assignedTo: config.ownerId,
      customFields: recentFields(lead, config),
      createNewIfDuplicateAllowed: false,
    });
    contactId = contact.id;
    await control.checkpoint({ contactId });
  }

  if (!control.progress.originalAttributionCompleted) {
    await control.withResourceLease(
      `original-attribution:${config.locationId}:${contactId}`,
      async () => {
        const currentFields = await gateway.getContactCustomFields(contactId);
        const values = new Map(currentFields.map((item) => [item.id, item.fieldValue]));
        const missingOriginalFields = originalFields(lead, config).filter((item) => (
          item.fieldValue.trim() !== '' && !(values.get(item.id) || '').trim()
        ));
        let wroteOriginalFields = false;
        if (missingOriginalFields.length > 0) {
          try {
            await gateway.updateContactCustomFields(contactId, missingOriginalFields);
            wroteOriginalFields = true;
          } catch (error) {
            retainLeaseForUncertainWrite(error);
          }
        }
        try {
          await control.checkpoint({ originalAttributionCompleted: true });
        } catch (error) {
          if (wroteOriginalFields) throw new RetainResourceLeaseError(error);
          throw error;
        }
      },
    );
  }

  if (!control.progress.tagsCompleted) {
    await gateway.addContactTags(contactId, [
      config.contactTag,
      `fit:${fit}`,
      `model:${lead.qualification.salesModel}`,
    ]);
    await control.checkpoint({ tagsCompleted: true });
  }

  if (fit !== 'priority') {
    return { contactId, opportunityCreated: false };
  }

  let opportunityId = control.progress.opportunityId;
  let opportunityCreated = control.progress.opportunityCreated;
  if (!opportunityId) {
    await control.withResourceLease(
      `opportunity:${config.locationId}:${config.pipelineId}:${contactId}`,
      async () => {
        const existing = selectOrReject(await gateway.findOpenOpportunities(
          config.locationId,
          config.pipelineId,
          contactId,
        ));
        let resolvedOpportunityId: string;
        let createdRemotely = false;
        if (existing) {
          resolvedOpportunityId = existing.id;
        } else {
          try {
            const created = await gateway.createOpportunity({
              pipelineId: config.pipelineId,
              locationId: config.locationId,
              name: `${lead.business || lead.name} — consulta web`,
              pipelineStageId: config.consultaStageId,
              status: 'open',
              contactId,
              assignedTo: config.ownerId,
            });
            resolvedOpportunityId = created.id;
            createdRemotely = true;
          } catch (error) {
            retainLeaseForUncertainWrite(error);
          }
        }
        opportunityId = resolvedOpportunityId;
        opportunityCreated = !existing;
        try {
          await control.checkpoint({ opportunityId, opportunityCreated });
        } catch (error) {
          if (createdRemotely) throw new RetainResourceLeaseError(error);
          throw error;
        }
      },
    );
  }

  let taskId = control.progress.taskId;
  if (!taskId) {
    const taskMarker = `[playful-submission:${control.submissionKey}]`;
    await control.withResourceLease(`task:${contactId}:${control.submissionKey}`, async () => {
      const existing = (await gateway.findTasks(contactId)).find((task) => (
        (task.body || '').includes(taskMarker)
      ));
      let createdRemotely = false;
      if (existing) {
        taskId = existing.id;
      } else {
        const dueDate = new Date(now.getTime() + config.slaHours * 60 * 60 * 1000).toISOString();
        let task;
        try {
          task = await gateway.createTask(contactId, {
            title: 'Responder consulta web',
            body: `Siguiente acción del formulario ${lead.recentAttribution.formId}. ${taskMarker}`,
            dueDate,
            completed: false,
            assignedTo: config.ownerId,
          });
          createdRemotely = true;
        } catch (error) {
          retainLeaseForUncertainWrite(error);
        }
        taskId = task.id;
      }
      try {
        await control.checkpoint({ taskId });
      } catch (error) {
        if (createdRemotely) throw new RetainResourceLeaseError(error);
        throw error;
      }
    });
  }

  if (!opportunityId || opportunityCreated === undefined || !taskId) {
    throw new Error('El flujo CRM terminó sin checkpoints obligatorios.');
  }

  return { contactId, opportunityId, opportunityCreated, taskId };
}
