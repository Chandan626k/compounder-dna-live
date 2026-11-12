import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const html=fs.readFileSync(new URL('../public/terminal.html',import.meta.url),'utf8');
const uiPath=fileURLToPath(new URL('../public/recommendation-readiness-ui.js',import.meta.url));
const ui=fs.readFileSync(uiPath,'utf8');
assert.match(html,/Investor guidance/);assert.match(html,/id="guidanceSummary"/);assert.match(html,/id="guidanceSteps"/);
assert.match(html,/window\.renderReadiness\(readiness\)/);assert.match(html,/recommendation-readiness-ui\.js/);
assert.match(ui,/LONG_TERM:'Long Term'/);assert.match(ui,/SWING:'Swing'/);assert.match(ui,/SHORT_TERM:'Short Term'/);assert.match(ui,/INTRADAY:'Intraday'/);
assert.match(ui,/publication_and_availability_timestamps:'Filing publication and availability timestamps'/);
assert.equal(/BUY|SELL/i.test(ui),false,'readiness renderer must not generate trading instructions');
const ids=['readinessGrid','readinessDetails','readinessPolicy','guidanceSummary','guidanceSteps','guidanceStatus'];
const nodes=Object.fromEntries(ids.map(id=>[id,{innerHTML:'',textContent:''}]));
const window={};vm.runInNewContext(ui,{window,document:{getElementById:id=>nodes[id]||null}});
assert.equal(typeof window.renderReadiness,'function');
window.renderReadiness({horizons:{
 LONG_TERM:{state:'PARTIALLY_READY',recommendationEligible:false,availableEvidence:[],missingEvidence:['roe'],blockers:[{key:'pit',reason:'Financial evidence contains PIT_UNKNOWN records; retrievedAt is not publicationTimestamp.'}],nextRequiredEvidence:['publication_and_availability_timestamps','source_document_and_version','verified_financial_currency_match']},
 SWING:{state:'NOT_READY',recommendationEligible:false,availableEvidence:[],missingEvidence:['invalidation_stop'],blockers:[{key:'risk_evidence',reason:'BREAKOUT_EVIDENCE_PRESENT_BUT_RECOMMENDATION_NOT_READY'}],nextRequiredEvidence:['invalidation_stop','risk_reward']},
 SHORT_TERM:{state:'NOT_READY',recommendationEligible:false,availableEvidence:[],missingEvidence:['intraday_candles'],blockers:[{key:'intraday_source',reason:'SHORT_TERM_DATA_SOURCE_NOT_PRODUCTION_QUALIFIED'}],nextRequiredEvidence:['production_qualified_intraday_source','session_aware_intraday_candles']},
 INTRADAY:{state:'NOT_AVAILABLE',recommendationEligible:false,availableEvidence:[],missingEvidence:['production_qualified_intraday_source'],blockers:[{key:'intraday_source',reason:'Production-qualified intraday evidence source is not connected.'}],nextRequiredEvidence:['exchange_session_calendar']}
},policy:{recommendationEnginePresent:false}});
assert.match(nodes.guidanceSummary.textContent,/No timeframe is currently eligible/);
assert.match(nodes.guidanceSteps.innerHTML,/Filing publication and availability timestamps/);
assert.match(nodes.guidanceSteps.innerHTML,/Original source document and version/);
assert.match(nodes.guidanceSteps.innerHTML,/validated entry, invalidation, target and risk\/reward/);
assert.match(nodes.readinessGrid.innerHTML,/Partially ready/);
assert.match(nodes.readinessDetails.innerHTML,/verified currency match/);
assert.doesNotMatch(nodes.guidanceSteps.innerHTML,/publication_and_availability_timestamps|BREAKOUT_EVIDENCE_PRESENT/);
assert.equal(nodes.readinessPolicy.textContent,'RECOMMENDATION ENGINE OFF');
const check=spawnSync(process.execPath,['--check',uiPath],{encoding:'utf8'});assert.equal(check.status,0,check.stderr||'readiness UI syntax failed');
console.log('frontend recommendation readiness and investor guidance: PASS');
