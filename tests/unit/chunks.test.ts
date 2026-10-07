import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CHUNK_SIZE, countKey, joinChunks, partKey, splitIntoChunks } from '../../src/lib/auth/chunks.ts';

test('a session larger than one SecureStore item round-trips through chunks', () => {
  const session = JSON.stringify({ access_token: 'x'.repeat(5000), user: { email: 'brian@example.com' } });
  const chunks = splitIntoChunks(session);
  assert.ok(chunks.length > 1, 'expected more than one chunk');
  assert.ok(chunks.every((c) => c.length <= CHUNK_SIZE), 'every chunk fits a SecureStore item');
  assert.equal(joinChunks(chunks), session);
});

test('small and empty values use a single chunk', () => {
  assert.deepEqual(splitIntoChunks('abc'), ['abc']);
  assert.deepEqual(splitIntoChunks(''), ['']);
  assert.equal(joinChunks(['']), '');
});

test('a missing chunk reads as no session rather than a corrupt one', () => {
  assert.equal(joinChunks(['abc', null, 'ghi']), null);
});

test('slot names are SecureStore-safe (alphanumerics, ".", "-", "_")', () => {
  for (const k of [countKey('stickler-auth-token'), partKey('stickler-auth-token', 12)]) {
    assert.match(k, /^[A-Za-z0-9._-]+$/);
  }
});
