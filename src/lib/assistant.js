import { getWarrantStatus } from './warrant.js';

export const AI_ASSISTANT_ACTIONS = [
  { id: 'case', label: 'Analyze case' },
  { id: 'report', label: 'Generate legal report draft' },
  { id: 'audit', label: 'Summarize audit logs' },
  { id: 'errors', label: 'Diagnose system errors' },
  { id: 'alerts', label: 'Explain alerts' },
  { id: 'next_step', label: 'Suggest next investigation step' },
  { id: 'warrant', label: 'Check warrant validity' },
  { id: 'health', label: 'Check system health' }
];

function riskFor(actionId, context = {}) {
  if (actionId === 'warrant' && getWarrantStatus(context.warrant) !== 'Active') return 'High';
  if (actionId === 'errors' || actionId === 'alerts') return 'Medium';
  if (actionId === 'report' || actionId === 'next_step') return 'Medium';
  return 'Low';
}

export function runPermissionFirstAssistant(actionId, notes, context = {}) {
  const action = AI_ASSISTANT_ACTIONS.find((item) => item.id === actionId) || AI_ASSISTANT_ACTIONS[0];
  const cleanNotes = String(notes || '').trim();
  const warrantStatus = getWarrantStatus(context.warrant);
  const riskLevel = riskFor(action.id, context);

  const basis = cleanNotes
    ? `Based on the provided notes, the assistant can support "${action.label}" without changing records.`
    : `No detailed notes were provided. The assistant can only give a limited "${action.label}" assessment.`;

  return {
    action: action.label,
    explanation: 'This assistant provides analysis only. It does not modify records, submit requests, approve access, revoke access, or contact external systems.',
    impact: 'No operational change is made. The output is a recommendation for an authorized operator to review.',
    summary: `${basis} Current warrant status: ${warrantStatus}.`,
    riskLevel,
    requiredPermissions: 'Authorized operator review and administrator approval are required before any sensitive follow-up.',
    recommendedNextStep: warrantStatus === 'Active'
      ? 'Review the analysis, attach it to the relevant case only after administrator approval, and preserve the audit trail.'
      : 'Renew or approve a valid warrant window before any operational follow-up.',
    requiredHumanApproval: 'Administrator approval is required before any delete, modify, approve, revoke, submit, or external action.',
    canActAutomatically: false
  };
}
