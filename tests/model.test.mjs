import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSupplier, suppliersModel } from '../src/model.js';
const draft = { documentNumber: ' demo-001 ', name: ' Synthetic Supplier ', email: '' };
const resource = { id: 'fixture', documentNumber: 'DEMO-001', name: 'Synthetic Supplier', active: true };
const listing = { data: [resource], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
test('normalizes body, omits blank optional fields and validates limits', () => {
  assert.deepEqual(normalizeSupplier(draft), { documentNumber: 'DEMO-001', name: 'Synthetic Supplier' });
  assert.throws(() => normalizeSupplier({ ...draft, documentNumber: 'bad document' }));
  assert.throws(() => normalizeSupplier({ ...draft, name: 'x'.repeat(161) }));
});
test('reads list and can retry a failed consultation', async () => {
  let failed = true;
  const model = suppliersModel(async path => { assert.equal(path, '/api/v1/suppliers?page=1&limit=20'); if (failed) throw Error('offline'); return listing; });
  await model.load(); assert.ok(model.snapshot().error); failed = false; await model.load(); assert.equal(model.snapshot().data.length, 1);
});
test('lost reply keeps body/key through remount and successful retry clears it', async () => {
  const registration = { pending: null }, calls = []; let fail = true;
  const request = async (path, options) => { if (!options) return listing; calls.push(options); if (fail) throw Error('response lost'); return resource; };
  const first = suppliersModel(request, undefined, registration); await first.create(draft);
  assert.ok(registration.pending); assert.equal(first.snapshot().locked, true); first.dispose(); fail = false;
  const second = suppliersModel(request, undefined, registration); await second.create(draft);
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  assert.equal(calls[0].body, calls[1].body); assert.equal(registration.pending, null); assert.equal(second.snapshot().saved, true);
});
test('duplicate submissions and changing an uncertain body do not send another write', async () => {
  let resolve, count = 0; const pending = new Promise(done => { resolve = done; });
  const store = { pending: null }; const model = suppliersModel(async (path, options) => { if (!options) return listing; count++; return pending; }, undefined, store);
  const first = model.create(draft); await model.create(draft); assert.equal(count, 1); resolve(resource); await first;
  store.pending = { key: 'fixture-key', body: JSON.stringify(normalizeSupplier(draft)) };
  await model.create({ ...draft, name: 'Changed' }); assert.equal(count, 1);
});
test('definitive validation rejection allows correction with a new key', async () => {
  const keys = []; const model = suppliersModel(async (path, options) => { if (!options) return listing; keys.push(options.headers['Idempotency-Key']); if (keys.length === 1) throw Object.assign(Error('duplicate'), { status: 422 }); return resource; });
  await model.create(draft); assert.equal(model.snapshot().locked, false); await model.create(draft); assert.notEqual(keys[0], keys[1]);
});
test('disposed models ignore delayed reads and malformed reads show an error', async () => {
  let resolve; const pending = new Promise(done => { resolve = done; });
  const model = suppliersModel(() => pending); const read = model.load(); model.dispose(); resolve(listing); await read; assert.equal(model.snapshot().data.length, 0);
  const invalid = suppliersModel(async () => ({ data: [], meta: {} })); await invalid.load(); assert.ok(invalid.snapshot().error);
});
