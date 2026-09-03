import { createHash, randomUUID } from 'node:crypto';
import type { WebsiteLead, LeadProcessingResult } from './types.ts';
import { DeterministicContactDeliveryError } from './delivery.ts';
import {
  type BeginResult,
  type CrmProgress,
  type IdempotencyStore,
  IdempotencyStoreUnavailableError,
  SubmissionInProgressError,
} from './idempotency.ts';
import type { WordPressReceiptState } from './delivery.ts';

export interface CrmSyncControl {
  submissionKey: string;
  progress: CrmProgress;
  checkpoint(patch: Partial<CrmProgress>): Promise<void>;
  withResourceLease<T>(resource: string, operation: () => Promise<T>): Promise<T>;
}

export class RetainResourceLeaseError extends Error {
  constructor(public readonly originalError: unknown) {
    super('El resultado remoto es incierto; el lease se conservará hasta expirar.');
    this.name = 'RetainResourceLeaseError';
  }
}

export class ContactPipelineUnavailableBeforeDeliveryError extends Error {
  constructor() {
    super('No pudimos iniciar el envío y WordPress no fue contactado.');
    this.name = 'ContactPipelineUnavailableBeforeDeliveryError';
  }
}

export class DeliveryReceiptMissingError extends Error {
  constructor() {
    super('WordPress no encontró un recibo para este intento. Inicia una solicitud nueva para enviarla.');
    this.name = 'DeliveryReceiptMissingError';
  }
}

export interface ContactPipelineDependencies {
  store: IdempotencyStore;
  deliver: (lead: WebsiteLead) => Promise<void>;
  reconcileDelivery?: (lead: WebsiteLead) => Promise<WordPressReceiptState>;
  syncCrm?: (lead: WebsiteLead, control: CrmSyncControl) => Promise<void>;
  dryRun: boolean;
  ownerId?: string;
  reconcileOnly?: boolean;
}

export function submissionKey(submissionId: string): string {
  return createHash('sha256').update(submissionId).digest('hex');
}

export function submissionFingerprint(lead: WebsiteLead): string {
  // The verifier token and capture timestamp change between explicit receipt
  // checks. All user-controlled content and attribution remain bound to the
  // durable submission id without storing PII in Redis.
  return createHash('sha256').update(JSON.stringify({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    business: lead.business,
    message: lead.message,
    qualification: lead.qualification,
    privacyConsent: lead.privacyConsent,
    marketingConsent: lead.marketingConsent,
    originalAttribution: lead.originalAttribution,
    recentAttribution: lead.recentAttribution,
  })).digest('hex');
}

function pendingDelivery(dryRun: boolean, replayed: boolean): LeadProcessingResult {
  return {
    deliveryStatus: 'pending_confirmation',
    delivered: false,
    crmSynced: false,
    dryRun,
    replayed,
  };
}

export async function processContactPipeline(
  lead: WebsiteLead,
  dependencies: ContactPipelineDependencies,
): Promise<LeadProcessingResult> {
  const key = submissionKey(lead.submissionId);
  const fingerprint = submissionFingerprint(lead);
  const owner = dependencies.ownerId || randomUUID();
  let initial: BeginResult;
  try {
    initial = await dependencies.store.begin(key, owner, fingerprint);
  } catch (error) {
    if (error instanceof IdempotencyStoreUnavailableError) {
      throw new ContactPipelineUnavailableBeforeDeliveryError();
    }
    throw error;
  }

  if (initial.kind === 'busy') throw new SubmissionInProgressError();

  if (initial.kind === 'existing' && initial.record.state === 'completed') {
    return {
      deliveryStatus: 'confirmed',
      delivered: true,
      crmSynced: initial.record.crmSynced,
      dryRun: initial.record.dryRun,
      replayed: true,
    };
  }

  let deliveredRecord = initial.kind === 'existing' && initial.record.state === 'delivered'
    ? initial.record
    : undefined;

  if (initial.kind === 'acquired' && dependencies.reconcileOnly) {
    if (!dependencies.reconcileDelivery) {
      await dependencies.store.releaseDelivery(key, owner);
      return pendingDelivery(dependencies.dryRun, true);
    }

    let receipt: WordPressReceiptState;
    try {
      receipt = await dependencies.reconcileDelivery(lead);
    } catch {
      try {
        await dependencies.store.releaseDelivery(key, owner);
      } catch {
        // The short lease expires; retaining it is safer than a blind write.
      }
      return pendingDelivery(dependencies.dryRun, true);
    }

    if (receipt === 'missing') {
      await dependencies.store.clearPendingDelivery(key, owner);
      throw new DeliveryReceiptMissingError();
    }
    if (receipt === 'processing') {
      await dependencies.store.releaseDelivery(key, owner);
      return pendingDelivery(dependencies.dryRun, true);
    }

    try {
      await dependencies.store.markDelivered(key, owner);
      deliveredRecord = { state: 'delivered', fingerprint, crm: {} };
    } catch {
      return pendingDelivery(dependencies.dryRun, true);
    }
  }

  if (initial.kind === 'existing' && (
    initial.record.state === 'delivery_pending'
    || initial.record.state === 'delivery_uncertain'
  )) {
    const current = await dependencies.store.beginDeliveryReconciliation(key, owner);
    if (!current) throw new DeliveryReceiptMissingError();
    if (current.state === 'completed') {
      return {
        deliveryStatus: 'confirmed',
        delivered: true,
        crmSynced: current.crmSynced,
        dryRun: current.dryRun,
        replayed: true,
      };
    }
    if (current.state === 'delivered') {
      deliveredRecord = current;
    } else {
      if (!dependencies.reconcileDelivery) {
        await dependencies.store.releaseDelivery(key, owner);
        return pendingDelivery(dependencies.dryRun, true);
      }

      let receipt: WordPressReceiptState;
      try {
        receipt = await dependencies.reconcileDelivery(lead);
      } catch {
        try {
          await dependencies.store.releaseDelivery(key, owner);
        } catch {
          // The short lease expires; retaining it is safer than overlapping checks.
        }
        return pendingDelivery(dependencies.dryRun, true);
      }

      if (receipt === 'missing') {
        await dependencies.store.clearPendingDelivery(key, owner);
        throw new DeliveryReceiptMissingError();
      }
      if (receipt === 'processing') {
        await dependencies.store.releaseDelivery(key, owner);
        return pendingDelivery(dependencies.dryRun, true);
      }

      try {
        await dependencies.store.markDelivered(key, owner);
        deliveredRecord = { state: 'delivered', fingerprint, crm: {} };
      } catch {
        return pendingDelivery(dependencies.dryRun, true);
      }
    }
  }

  let delivered = Boolean(deliveredRecord);

  if (!delivered) {
    try {
      await dependencies.deliver(lead);
    } catch (error) {
      if (error instanceof DeterministicContactDeliveryError) {
        await dependencies.store.clearPendingDelivery(key, owner);
        throw error;
      }
      try {
        await dependencies.store.markDeliveryUncertain(key, owner);
      } catch {
        // begin() persisted delivery_pending before the remote write. Keeping
        // that durable reservation is safer than a blind second delivery.
      }
      return pendingDelivery(dependencies.dryRun, false);
    }
    try {
      await dependencies.store.markDelivered(key, owner);
      delivered = true;
    } catch {
      // WordPress returned success but its Redis checkpoint was not confirmed.
      // delivery_pending remains durable and prevents another remote write.
      return pendingDelivery(dependencies.dryRun, false);
    }
  }

  if (!await dependencies.store.beginCrm(key, owner)) {
    throw new SubmissionInProgressError();
  }

  const progress: CrmProgress = deliveredRecord ? { ...deliveredRecord.crm } : {};
  const control: CrmSyncControl = {
    submissionKey: key,
    progress,
    checkpoint: async (patch) => {
      const next = { ...progress, ...patch };
      await dependencies.store.saveCrmProgress(key, owner, next);
      Object.assign(progress, patch);
    },
    withResourceLease: async (resource, operation) => {
      if (!await dependencies.store.acquireResourceLease(resource, owner)) {
        throw new SubmissionInProgressError();
      }
      let release = true;
      try {
        return await operation();
      } catch (error) {
        if (error instanceof RetainResourceLeaseError) {
          release = false;
          throw error.originalError;
        }
        throw error;
      } finally {
        if (release) await dependencies.store.releaseResourceLease(resource, owner);
      }
    },
  };

  try {
    if (dependencies.syncCrm) await dependencies.syncCrm(lead, control);
    await dependencies.store.markCompleted(
      key,
      owner,
      Boolean(dependencies.syncCrm),
      dependencies.dryRun,
    );
  } catch (error) {
    await dependencies.store.releaseCrm(key, owner);
    throw error;
  }

  return {
    deliveryStatus: 'confirmed',
    delivered: true,
    crmSynced: Boolean(dependencies.syncCrm),
    dryRun: dependencies.dryRun,
    replayed: false,
  };
}
