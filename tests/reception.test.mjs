import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receptionBody, receptionModel, steps, today } from '../src/reception-model.js';
const id = '11111111-1111-4111-8111-111111111111';
const draft = { supplierId: id, medicationId: id, reference: ' ref-01 ', lotNumber: 'lot-01', expiresOn: '2099-01-01', quantity: '10' };
const running = { id, status: 'RUNNING', completedSteps: [], entryId: null, receiptId: null };
const completed = { ...running, status: 'COMPLETED', completedSteps: steps, entryId: id, receiptId: id };
test('validates bounds and uses Bogota calendar without UTC off-by-one', () => {
  assert.equal(today(new Date('2026-10-12T02:00:00Z')), '2026-10-11');
  assert.equal(receptionBody(draft).reference, 'REF-01');
  for (const patch of [{ quantity: 0 }, { quantity: 1.5 }, { quantity: 1000001 }, { expiresOn: '2026-02-30' }, { reference: 'bad/ref' }]) assert.throws(() => receptionBody({ ...draft, ...patch }));
});
test('lost acknowledgement replays identical body/key after remount', async () => {
  const store = { pending: null }, calls = []; let lost = true;
  const request = async (path, options) => { calls.push([path, options]); if (lost) throw Error('lost response'); return completed; };
  const first = receptionModel(request, store); await first.start(draft); assert.equal(first.reset(), false); first.dispose(); lost = false;
  const second = receptionModel(request, store); await second.start(draft);
  assert.equal(calls[0][1].body, calls[1][1].body); assert.equal(calls[0][1].headers['Idempotency-Key'], calls[1][1].headers['Idempotency-Key']); assert.equal(second.snapshot().result.status, 'COMPLETED');
});
test('start replay is not resume; RUNNING requires explicit command', async () => {
  const calls = [], store = { pending: null };
  const model = receptionModel(async (path, options) => { calls.push([path, options]); return path.endsWith('/resume') ? completed : running; }, store);
  await model.start(draft); assert.equal(model.snapshot().result.status, 'RUNNING'); assert.equal(calls.length, 1);
  await model.action(id, true); assert.equal(calls[1][0], `/api/v1/sagas/${id}/resume`); assert.equal(calls[1][1].body, '{}'); assert.equal(model.reset(), true);
});
test('unknown intent rejects edits/other lookup; FAILED cannot be abandoned as completed', async () => {
  const store = { pending: null }; let calls = 0;
  const model = receptionModel(async () => { calls++; throw Error('uncertain'); }, store); await model.start(draft);
  await model.start({ ...draft, quantity: 2 }); await model.action(id); assert.equal(calls, 1);
  store.pending.result = { ...running, status: 'FAILED' }; assert.equal(model.reset(), false);
});
test('replay still works after date rollover; malformed completion never reports success', async () => {
  const old = { ...draft, expiresOn: '2020-01-01' }; const store = { pending: { key: 'original-key', body: JSON.stringify(receptionBody(old, false)), result: null } };
  const model = receptionModel(async () => completed, store); await model.start(old); assert.equal(model.snapshot().result.status, 'COMPLETED');
  const invalid = receptionModel(async () => ({ ...completed, completedSteps: [] }), { pending: null }); await invalid.start(draft); assert.equal(invalid.snapshot().result, null); assert.ok(invalid.snapshot().error);
});
