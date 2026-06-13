'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { challengeResponse } = require('./ebay-deletion');

// Known-good vector, computed independently:
//   sha256("abc123" + "testtoken" + "https://example.com/deletion")
test('challengeResponse follows eBay spec: sha256(code + token + endpoint)', () => {
  process.env.EBAY_DELETION_VERIFICATION_TOKEN = 'testtoken';
  process.env.EBAY_DELETION_ENDPOINT = 'https://example.com/deletion';
  assert.strictEqual(
    challengeResponse('abc123'),
    'e8297c7146e750815f16cb1a4fe2fe25c09b6cdc0ffafdb1b92144559d30e9a8'
  );
});

test('challengeResponse throws when token/endpoint not configured', () => {
  delete process.env.EBAY_DELETION_VERIFICATION_TOKEN;
  delete process.env.EBAY_DELETION_ENDPOINT;
  assert.throws(() => challengeResponse('abc123'), /must be set/);
});
