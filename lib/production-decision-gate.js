// Central production decision gate.
// A BUY/SELL action is forbidden until strategy validation is explicitly production-ready.
// This defaults closed: validation must opt in, never opt out.
export const STRATEGY_VALIDATION_STATUS = 'BLOCKED — HEURISTIC / EXPERIMENTAL / INSUFFICIENT VALIDATION';
export const PRODUCTION_ACTIONS_ENABLED = false;

export function gateTradingAction(action) {
  if (PRODUCTION_ACTIONS_ENABLED) return action;
  const value = String(action || '').toUpperCase();
  if (value.includes('BUY') || value.includes('SELL')) return 'NO TRADE — VALIDATION REQUIRED';
  return action || 'WAIT';
}

export function productionDecisionPolicy() {
  return {
    productionActionsEnabled: PRODUCTION_ACTIONS_ENABLED,
    strategyValidationStatus: STRATEGY_VALIDATION_STATUS,
    fabricatedSignals: false,
    rule: 'BUY/SELL is blocked unless strategy validation explicitly passes production-readiness gates.'
  };
}
