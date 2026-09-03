import assert from 'node:assert/strict';
import test from 'node:test';
import {
  type CrmSyncControl,
  RetainResourceLeaseError,
} from '../../lib/contact/orchestrator.ts';
import { SubmissionInProgressError } from '../../lib/contact/idempotency.ts';
import {
  HighLevelApiError,
  type CreateOpportunityInput,
  type CreateTaskInput,
  type HighLevelCustomFieldValue,
  type HighLevelGateway,
  type HighLevelOpportunity,
  type HighLevelTask,
  type UpsertContactInput,
  type UpsertContactResult,
} from '../../lib/highlevel/client.ts';
import {
  AmbiguousOpportunityError,
  syncWebsiteLeadToHighLevel,
} from '../../lib/highlevel/workflow.ts';
import { config, lead } from './fixtures.ts';

class GatewayMock implements HighLevelGateway {
  calls: Array<{ operation: string; value?: unknown }> = [];
  contact: UpsertContactResult = { id: 'contact-1', isNew: true };
  opportunities: HighLevelOpportunity[] = [];
  tasks: HighLevelTask[] = [];
  customFields = new Map<string, string>();
  loseFirstUpsertResponse = false;
  loseFirstOriginalResponse = false;
  loseFirstOpportunityResponse = false;
  loseFirstTaskResponse = false;
  originalWriteError?: unknown;
  opportunityWriteError?: unknown;
  taskWriteError?: unknown;

  async upsertContact(input: UpsertContactInput) {
    this.calls.push({ operation: 'upsert', value: input });
    if (this.loseFirstUpsertResponse) {
      this.loseFirstUpsertResponse = false;
      throw new Error('response lost after HighLevel applied upsert');
    }
    return this.contact;
  }
  async getContactCustomFields() {
    this.calls.push({ operation: 'get-fields' });
    return Array.from(this.customFields).map(([id, fieldValue]) => ({ id, fieldValue }));
  }
  async updateContactCustomFields(contactId: string, customFields: HighLevelCustomFieldValue[]) {
    this.calls.push({ operation: 'update-original', value: { contactId, customFields } });
    if (this.originalWriteError) throw this.originalWriteError;
    for (const item of customFields) this.customFields.set(item.id, item.fieldValue);
    if (this.loseFirstOriginalResponse) {
      this.loseFirstOriginalResponse = false;
      throw new Error('response lost after HighLevel applied original fields');
    }
  }
  async addContactTags(contactId: string, tags: string[]) {
    this.calls.push({ operation: 'tag', value: { contactId, tags } });
  }
  async findOpenOpportunities() {
    this.calls.push({ operation: 'search' });
    return [...this.opportunities];
  }
  async createOpportunity(input: CreateOpportunityInput) {
    this.calls.push({ operation: 'create-opportunity', value: input });
    if (this.opportunityWriteError) throw this.opportunityWriteError;
    const opportunity = { id: `opportunity-${this.opportunities.length + 1}`, status: 'open' };
    this.opportunities.push(opportunity);
    if (this.loseFirstOpportunityResponse) {
      this.loseFirstOpportunityResponse = false;
      throw new Error('response lost after HighLevel created opportunity');
    }
    return { id: opportunity.id };
  }
  async findTasks() {
    this.calls.push({ operation: 'find-tasks' });
    return [...this.tasks];
  }
  async createTask(contactId: string, input: CreateTaskInput) {
    this.calls.push({ operation: 'create-task', value: { contactId, input } });
    if (this.taskWriteError) throw this.taskWriteError;
    const task = { id: `task-${this.tasks.length + 1}`, title: input.title, body: input.body };
    this.tasks.push(task);
    if (this.loseFirstTaskResponse) {
      this.loseFirstTaskResponse = false;
      throw new Error('response lost after HighLevel created task');
    }
    return { id: task.id };
  }
}

function memoryControl(
  submissionKey: string,
  locks = new Set<string>(),
): CrmSyncControl {
  const progress: CrmSyncControl['progress'] = {};
  return {
    submissionKey,
    progress,
    checkpoint: async (patch) => { Object.assign(progress, patch); },
    withResourceLease: async (resource, operation) => {
      if (locks.has(resource)) throw new SubmissionInProgressError();
      locks.add(resource);
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
        if (release) locks.delete(resource);
      }
    },
  };
}

test('checkpoints contact, first touch, tag, Consulta opportunity and SLA task', async () => {
  const gateway = new GatewayMock();
  const control = memoryControl('submission-a');
  const result = await syncWebsiteLeadToHighLevel(
    lead,
    gateway,
    config,
    new Date('2026-08-30T12:00:00.000Z'),
    control,
  );

  assert.equal(result.opportunityCreated, true);
  assert.deepEqual(gateway.calls.map((call) => call.operation), [
    'upsert', 'get-fields', 'update-original', 'tag', 'search',
    'create-opportunity', 'find-tasks', 'create-task',
  ]);
  assert.deepEqual(control.progress, {
    contactId: 'contact-1',
    originalAttributionCompleted: true,
    tagsCompleted: true,
    opportunityId: 'opportunity-1',
    opportunityCreated: true,
    taskId: 'task-1',
  });

  const upsert = gateway.calls[0].value as UpsertContactInput;
  assert.equal(upsert.createNewIfDuplicateAllowed, false);
  assert(!JSON.stringify(upsert.customFields).includes('field-original-source'));

  const opportunity = gateway.calls[5].value as CreateOpportunityInput;
  assert.equal(opportunity.pipelineStageId, 'stage-consulta-test');

  const task = gateway.calls[7].value as { input: CreateTaskInput };
  assert.equal(task.input.dueDate, '2026-08-31T12:00:00.000Z');
  assert.match(task.input.body, /\[playful-submission:submission-a\]/);
});

test('retains marketplace-transition contacts without creating an opportunity or SLA task', async () => {
  const gateway = new GatewayMock();
  const transitionLead = {
    ...lead,
    qualification: {
      ...lead.qualification,
      salesModel: 'mercado_libre' as const,
    },
  };

  const result = await syncWebsiteLeadToHighLevel(transitionLead, gateway, config);

  assert.deepEqual(result, { contactId: 'contact-1', opportunityCreated: false });
  assert.deepEqual(gateway.calls.map((call) => call.operation), [
    'upsert', 'get-fields', 'update-original', 'tag',
  ]);
  const upsert = gateway.calls[0].value as UpsertContactInput;
  assert(upsert.customFields.some((item) => (
    item.id === config.customFieldIds.sales_model && item.fieldValue === 'mercado_libre'
  )));
  assert(upsert.customFields.some((item) => (
    item.id === config.customFieldIds.qualification_level && item.fieldValue === 'transition'
  )));
});

test('fills only blank original attribution fields for existing contacts', async () => {
  const gateway = new GatewayMock();
  gateway.contact = { id: 'contact-1', isNew: false };
  gateway.customFields.set(config.customFieldIds.original_source, 'referral');
  gateway.customFields.set(config.customFieldIds.original_landing, '');
  gateway.opportunities = [{ id: 'opportunity-existing', status: 'open' }];

  const result = await syncWebsiteLeadToHighLevel(lead, gateway, config);
  assert.equal(result.opportunityCreated, false);
  const update = gateway.calls.find((call) => call.operation === 'update-original')?.value as {
    customFields: HighLevelCustomFieldValue[];
  };
  assert.deepEqual(update.customFields, [{
    id: config.customFieldIds.original_landing,
    fieldValue: lead.originalAttribution.landing,
  }]);
});

test('first touch survives lost upsert and attribution responses on retry', async () => {
  const gateway = new GatewayMock();
  const locks = new Set<string>();
  const control = memoryControl('submission-retry', locks);
  gateway.loseFirstUpsertResponse = true;

  await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
  assert.equal(control.progress.contactId, undefined);
  gateway.loseFirstOriginalResponse = true;
  await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
  assert.equal(control.progress.contactId, 'contact-1');
  assert.equal(control.progress.originalAttributionCompleted, undefined);

  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control),
    SubmissionInProgressError,
  );
  locks.clear(); // Simulates expiry of the retained first-touch lease.

  await syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control);
  assert.equal(gateway.calls.filter((call) => call.operation === 'upsert').length, 2);
  assert.equal(gateway.calls.filter((call) => call.operation === 'update-original').length, 1);
  assert.equal(gateway.customFields.get(config.customFieldIds.original_source), lead.originalAttribution.source);
  assert.equal(gateway.customFields.get(config.customFieldIds.original_landing), lead.originalAttribution.landing);
});

test('serializes first-touch attribution from two concurrent sources for the same contact', async () => {
  const gateway = new GatewayMock();
  const locks = new Set<string>();
  const first = memoryControl('submission-first-source', locks);
  const second = memoryControl('submission-second-source', locks);
  const secondLead = {
    ...lead,
    submissionId: 'submission-second-source',
    originalAttribution: {
      ...lead.originalAttribution,
      source: 'linkedin-organic',
      landing: '/contacto?utm_source=linkedin',
    },
  };
  let releaseFirstRead!: () => void;
  let signalFirstRead!: () => void;
  const firstReadEntered = new Promise<void>((resolve) => { signalFirstRead = resolve; });
  const firstReadBlocked = new Promise<void>((resolve) => { releaseFirstRead = resolve; });
  let blockFirstRead = true;
  gateway.getContactCustomFields = async () => {
    gateway.calls.push({ operation: 'get-fields' });
    if (blockFirstRead) {
      blockFirstRead = false;
      signalFirstRead();
      await firstReadBlocked;
    }
    return Array.from(gateway.customFields).map(([id, fieldValue]) => ({ id, fieldValue }));
  };

  const firstRun = syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), first);
  await firstReadEntered;
  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(secondLead, gateway, config, new Date(), second),
    SubmissionInProgressError,
  );
  releaseFirstRead();
  await firstRun;
  await syncWebsiteLeadToHighLevel(secondLead, gateway, config, new Date(), second);

  assert.equal(gateway.calls.filter((call) => call.operation === 'update-original').length, 1);
  assert.equal(
    gateway.customFields.get(config.customFieldIds.original_source),
    lead.originalAttribution.source,
  );
  assert.equal(
    gateway.customFields.get(config.customFieldIds.original_landing),
    lead.originalAttribution.landing,
  );
});

test('retains the opportunity lease if its post-create checkpoint fails', async () => {
  const gateway = new GatewayMock();
  const locks = new Set<string>();
  const control = memoryControl('submission-opportunity-checkpoint', locks);
  const checkpoint = control.checkpoint;
  let failOpportunityCheckpoint = true;
  control.checkpoint = async (patch) => {
    if (patch.opportunityId && failOpportunityCheckpoint) {
      failOpportunityCheckpoint = false;
      throw new Error('Redis unavailable after opportunity create');
    }
    await checkpoint(patch);
  };

  await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
  assert.equal(gateway.opportunities.length, 1);
  assert.equal(control.progress.opportunityId, undefined);
  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control),
    SubmissionInProgressError,
  );
  locks.clear();

  const recovered = await syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control);
  assert.equal(recovered.opportunityId, 'opportunity-1');
  assert.equal(gateway.calls.filter((call) => call.operation === 'create-opportunity').length, 1);
});

test('retains the task lease if its post-create checkpoint fails', async () => {
  const gateway = new GatewayMock();
  const locks = new Set<string>();
  const control = memoryControl('submission-task-checkpoint', locks);
  const checkpoint = control.checkpoint;
  let failTaskCheckpoint = true;
  control.checkpoint = async (patch) => {
    if (patch.taskId && failTaskCheckpoint) {
      failTaskCheckpoint = false;
      throw new Error('Redis unavailable after task create');
    }
    await checkpoint(patch);
  };

  await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
  assert.equal(gateway.tasks.length, 1);
  assert.equal(control.progress.taskId, undefined);
  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control),
    SubmissionInProgressError,
  );
  locks.clear();

  const recovered = await syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control);
  assert.equal(recovered.taskId, 'task-1');
  assert.equal(gateway.calls.filter((call) => call.operation === 'create-task').length, 1);
});

const uncertainWriteFailures = [
  ['HTTP 5xx', () => new HighLevelApiError(503, 'write')],
  ['transport', () => new TypeError('socket reset')],
  ['JSON parse', () => new SyntaxError('invalid JSON')],
] as const;

for (const [label, error] of uncertainWriteFailures) {
  test(`retains the first-touch lease after an uncertain ${label} write result`, async () => {
    const gateway = new GatewayMock();
    const locks = new Set<string>();
    const control = memoryControl(`submission-original-${label}`, locks);
    gateway.originalWriteError = error();

    await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
    await assert.rejects(
      () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control),
      SubmissionInProgressError,
    );
    assert.equal(gateway.calls.filter((call) => call.operation === 'update-original').length, 1);
  });

  test(`retains the opportunity lease after an uncertain ${label} write result`, async () => {
    const gateway = new GatewayMock();
    const locks = new Set<string>();
    const control = memoryControl(`submission-opportunity-${label}`, locks);
    gateway.opportunityWriteError = error();

    await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
    await assert.rejects(
      () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control),
      SubmissionInProgressError,
    );
    assert.equal(gateway.calls.filter((call) => call.operation === 'create-opportunity').length, 1);
  });

  test(`retains the task lease after an uncertain ${label} write result`, async () => {
    const gateway = new GatewayMock();
    const locks = new Set<string>();
    const control = memoryControl(`submission-task-${label}`, locks);
    gateway.opportunities = [{ id: 'opportunity-existing', status: 'open' }];
    gateway.taskWriteError = error();

    await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
    await assert.rejects(
      () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control),
      SubmissionInProgressError,
    );
    assert.equal(gateway.calls.filter((call) => call.operation === 'create-task').length, 1);
  });
}

test('releases resource leases after deterministic HTTP 4xx write failures', async () => {
  const originalGateway = new GatewayMock();
  const originalLocks = new Set<string>();
  const originalControl = memoryControl('submission-original-4xx', originalLocks);
  originalGateway.originalWriteError = new HighLevelApiError(409, 'update original attribution');

  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, originalGateway, config, new Date(), originalControl),
    HighLevelApiError,
  );
  assert.equal(originalLocks.size, 0);

  const opportunityGateway = new GatewayMock();
  const opportunityLocks = new Set<string>();
  const opportunityControl = memoryControl('submission-opportunity-4xx', opportunityLocks);
  opportunityGateway.opportunityWriteError = new HighLevelApiError(422, 'create opportunity');

  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, opportunityGateway, config, new Date(), opportunityControl),
    HighLevelApiError,
  );
  assert.equal(opportunityLocks.size, 0);

  const taskGateway = new GatewayMock();
  const taskLocks = new Set<string>();
  const taskControl = memoryControl('submission-task-4xx', taskLocks);
  taskGateway.opportunities = [{ id: 'opportunity-existing', status: 'open' }];
  taskGateway.taskWriteError = new HighLevelApiError(400, 'create task');

  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, taskGateway, config, new Date(), taskControl),
    HighLevelApiError,
  );
  assert.equal(taskLocks.size, 0);
});

test('recovers a task id when create succeeded but its response was lost', async () => {
  const gateway = new GatewayMock();
  const locks = new Set<string>();
  const control = memoryControl('submission-lost-task', locks);
  gateway.loseFirstTaskResponse = true;

  await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
  assert.equal(gateway.tasks.length, 1);
  assert.equal(control.progress.taskId, undefined);

  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control),
    SubmissionInProgressError,
  );
  locks.clear(); // Simulates expiry of the retained short lease.

  const recovered = await syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control);
  assert.equal(recovered.taskId, 'task-1');
  assert.equal(gateway.tasks.length, 1);
  assert.equal(gateway.calls.filter((call) => call.operation === 'create-task').length, 1);
});

test('recovers an opportunity when create succeeded but its response was lost', async () => {
  const gateway = new GatewayMock();
  const locks = new Set<string>();
  const control = memoryControl('submission-lost-opportunity', locks);
  gateway.loseFirstOpportunityResponse = true;

  await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control));
  assert.equal(gateway.opportunities.length, 1);
  assert.equal(control.progress.opportunityId, undefined);

  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control),
    SubmissionInProgressError,
  );
  locks.clear(); // Simulates expiry of the retained short lease.

  const recovered = await syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), control);
  assert.equal(recovered.opportunityId, 'opportunity-1');
  assert.equal(recovered.opportunityCreated, false);
  assert.equal(gateway.opportunities.length, 1);
  assert.equal(gateway.calls.filter((call) => call.operation === 'create-opportunity').length, 1);
});

test('serializes opportunity search-create for concurrent submissions to one contact and pipeline', async () => {
  const gateway = new GatewayMock();
  const locks = new Set<string>();
  const first = memoryControl('submission-concurrent-1', locks);
  const second = memoryControl('submission-concurrent-2', locks);
  let releaseSearch!: () => void;
  const searchBlocked = new Promise<void>((resolve) => { releaseSearch = resolve; });
  let firstSearch = true;
  gateway.findOpenOpportunities = async () => {
    gateway.calls.push({ operation: 'search' });
    if (firstSearch) {
      firstSearch = false;
      await searchBlocked;
    }
    return [...gateway.opportunities];
  };

  const firstRun = syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), first);
  await new Promise<void>((resolve) => setImmediate(resolve));
  await assert.rejects(
    () => syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), second),
    SubmissionInProgressError,
  );
  releaseSearch();
  await firstRun;
  await syncWebsiteLeadToHighLevel(lead, gateway, config, new Date(), second);

  assert.equal(gateway.calls.filter((call) => call.operation === 'create-opportunity').length, 1);
  assert.equal(gateway.opportunities.length, 1);
});

test('fails closed when the canonical pipeline already has multiple open opportunities', async () => {
  const gateway = new GatewayMock();
  gateway.opportunities = [
    { id: 'opportunity-1', status: 'open' },
    { id: 'opportunity-2', status: 'open' },
  ];

  await assert.rejects(() => syncWebsiteLeadToHighLevel(lead, gateway, config), AmbiguousOpportunityError);
  assert(!gateway.calls.some((call) => call.operation === 'create-opportunity'));
  assert(!gateway.calls.some((call) => call.operation === 'create-task'));
});
