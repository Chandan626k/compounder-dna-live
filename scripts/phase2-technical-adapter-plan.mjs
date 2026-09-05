import fs from 'node:fs';

const path = 'lib/market-engine.js';
const source = fs.readFileSync(path, 'utf8');

const importAnchor = "import { fetchStatementEvidence, mergeStatementEvidence, qualifyAnnualRows } from './statement-evidence.js';";
if (!source.includes(importAnchor)) throw new Error('Expected market-engine import anchor not found');
if (source.includes("./technical-compatibility-adapter.js")) throw new Error('Adapter import already present; refusing duplicate patch');

const technicalPattern = /function technical\(rows\) \{[\s\S]*?\n\}\n\nasync function fetchChart/;
const technicalMatches = source.match(technicalPattern) || [];
if (technicalMatches.length !== 1) throw new Error(`Expected exactly one legacy technical() block, found ${technicalMatches.length}`);

let candidate = source.replace(
  importAnchor,
  `${importAnchor}\nimport { technicalCompatibility } from './technical-compatibility-adapter.js';`,
);

candidate = candidate.replace(
  technicalPattern,
  `function technical(rows) {\n  return technicalCompatibility(rows, {\n    source: 'Yahoo Finance chart',\n    timeframe: '1d',\n  });\n}\n\nasync function fetchChart`,
);

const retrievalAnchor = "  const rows = [];";
if ((candidate.match(new RegExp(retrievalAnchor.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []).length !== 1) throw new Error('Expected exactly one fetchChart rows anchor');
candidate = candidate.replace(retrievalAnchor, "  const rows = [];\n  const retrievedAt = new Date().toISOString();");

const objectRow = `          date: new Date(item.date).toISOString(),\n          close, high, low, volume,`;
const objectReplacement = `          date: new Date(item.date).toISOString(),\n          open: num(item?.open),\n          close, high, low, volume,\n          retrievedAt,`;
if ((candidate.match(new RegExp(objectRow.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []).length !== 1) throw new Error('Expected exactly one object-format chart row');
candidate = candidate.replace(objectRow, objectReplacement);

const fallbackRow = `          date: new Date(timestamps[i] * 1000).toISOString(),\n          close, high, low, volume,`;
const fallbackReplacement = `          date: new Date(timestamps[i] * 1000).toISOString(),\n          open: num(q.open?.[i]),\n          close, high, low, volume,\n          retrievedAt,`;
if ((candidate.match(new RegExp(fallbackRow.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []).length !== 1) throw new Error('Expected exactly one fallback-format chart row');
candidate = candidate.replace(fallbackRow, fallbackReplacement);

fs.writeFileSync('/tmp/market-engine.candidate.js', candidate);
