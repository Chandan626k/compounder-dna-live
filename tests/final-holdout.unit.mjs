import assert from 'node:assert/strict';
import { freezeResearchArtifact } from '../lib/final-holdout-artifact-v2.js';
import { claimExactlyOnce } from '../lib/holdout-ledger.js';

const rows = Array.from({ length: 100 }, (_, i) => ({ date: `2020-01-${String((i % 28) + 1).padStart(2,'0')}`, o: 100+i, h: 101+i, l: 99+i, c: 100+i, v: 1000+i }));
const candidateSearch = { status:'COMPLETED', windows:[
  { window:1, trainStart:0, trainEnd:49, testStart:50, testEnd:59, chosen:'trend20_50_rsi55' },
  { window:2, trainStart:10, trainEnd:59, testStart:60, testEnd:79, chosen:'trend10_30_rsi50' },
] };
const a = freezeResearchArtifact({ symbol:'TCS', rows, candidateSearch });
const b = freezeResearchArtifact({ symbol:'TCS', rows, candidateSearch });
assert.equal(a.artifactHash, b.artifactHash);
assert.equal(a.modelSelection.chosenCandidateId, 'trend10_30_rsi50');
assert.equal(a.finalHoldout.status, 'UNTOUCHED');
assert.equal(a.finalHoldout.selectionUsed, false);

const originalFetch = globalThis.fetch;
const store = new Map();
globalThis.fetch = async (_url, options) => {
  const command = JSON.parse(options.body);
  if (command[0] === 'SET' && command[3] === 'NX') {
    if (store.has(command[1])) return new Response(JSON.stringify({ result:null }), { status:200 });
    store.set(command[1], command[2]);
    return new Response(JSON.stringify({ result:'OK' }), { status:200 });
  }
  throw new Error('unexpected test command');
};
process.env.UPSTASH_REDIS_REST_URL = 'https://test.invalid';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test';
assert.equal(await claimExactlyOnce('test-holdout', { status:'RUNNING' }), true);
assert.equal(await claimExactlyOnce('test-holdout', { status:'RUNNING' }), false);
globalThis.fetch = originalFetch;
console.log('final-holdout.unit: PASS');
