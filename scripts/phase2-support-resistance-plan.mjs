import fs from 'node:fs';

const path = 'lib/canonical-technical-engine.js';
const source = fs.readFileSync(path, 'utf8');
const importAnchor = "const finite = (v) => typeof v === 'number' && Number.isFinite(v);";
if (!source.includes(importAnchor)) throw new Error('Canonical engine anchor missing');
if (source.includes("./canonical-support-resistance.js")) throw new Error('Reaction support/resistance import already present');

const fnPattern = /function supportResistance\(rows\) \{[\s\S]*?\n\}\nfunction setupClassification/;
if ((source.match(fnPattern) || []).length !== 1) throw new Error('Expected exactly one legacy canonical supportResistance function');

let candidate = source.replace(
  importAnchor,
  "import { calculateReactionSupportResistance } from './canonical-support-resistance.js';\n\n" + importAnchor,
);
candidate = candidate.replace(fnPattern, 'const supportResistance = calculateReactionSupportResistance;\nfunction setupClassification');
candidate = candidate.replace("levels.status === 'VERIFIED_LEVELS'", "levels.status === 'VERIFIED_REACTION_ZONES'");
if (candidate === source) throw new Error('No support/resistance changes generated');
fs.writeFileSync('/tmp/canonical-technical-engine.candidate.js', candidate);
