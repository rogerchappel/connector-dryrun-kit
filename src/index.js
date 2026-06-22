const allowedRisk = new Set(['low', 'medium', 'high']);
const writeVerbs = new Set(['create', 'update', 'delete', 'send', 'invite', 'archive']);

export function buildReceipt(plan) {
  const errors = [];
  const warnings = [];
  const actions = Array.isArray(plan.actions) ? plan.actions : [];

  if (!plan.name) errors.push('Plan is missing name.');
  if (!plan.owner) errors.push('Plan is missing owner.');
  if (actions.length === 0) errors.push('Plan must include at least one action.');

  const normalized = actions.map((action, index) => normalizeAction(action, index, errors, warnings));
  const approvalRequired = normalized.some((action) => action.approvalRequired);
  const highestRisk = normalized.reduce((current, action) => riskRank(action.risk) > riskRank(current) ? action.risk : current, 'low');

  return {
    name: plan.name ?? 'Unnamed connector plan',
    owner: plan.owner ?? 'unknown',
    generatedAt: new Date(0).toISOString(),
    summary: plan.summary ?? '',
    approvalRequired,
    highestRisk,
    actions: normalized,
    warnings,
    errors
  };
}

function normalizeAction(action, index, errors, warnings) {
  const id = action.id ?? `action-${index + 1}`;
  const connector = action.connector ?? 'unknown';
  const verb = action.verb ?? 'unknown';
  const target = action.target ?? 'unknown';
  const risk = allowedRisk.has(action.risk) ? action.risk : 'high';
  const requiresApproval = action.requiresApproval === true || risk === 'high' || writeVerbs.has(verb);

  if (!action.id) warnings.push(`Action ${index + 1} is missing id; using ${id}.`);
  if (!action.connector) errors.push(`${id} is missing connector.`);
  if (!action.verb) errors.push(`${id} is missing verb.`);
  if (!action.target) errors.push(`${id} is missing target.`);
  if (!allowedRisk.has(action.risk)) warnings.push(`${id} has invalid or missing risk; treating as high.`);
  if (requiresApproval && !action.approver) warnings.push(`${id} requires approval but has no approver.`);

  return {
    id,
    connector,
    verb,
    target,
    risk,
    approvalRequired: requiresApproval,
    approver: action.approver ?? null,
    rollback: action.rollback ?? 'Manual review required before live execution.',
    notes: action.notes ?? ''
  };
}

function riskRank(risk) {
  return { low: 1, medium: 2, high: 3 }[risk] ?? 3;
}

export function renderMarkdown(receipt) {
  const lines = [
    `# Dry-Run Receipt: ${receipt.name}`,
    '',
    `Owner: ${receipt.owner}`,
    `Generated: ${receipt.generatedAt}`,
    `Highest risk: ${receipt.highestRisk}`,
    `Approval required: ${receipt.approvalRequired ? 'yes' : 'no'}`,
    ''
  ];

  if (receipt.summary) lines.push('## Summary', '', receipt.summary, '');
  lines.push('## Actions', '');
  for (const action of receipt.actions) {
    lines.push(
      `### ${action.id}`,
      '',
      `- Connector: ${action.connector}`,
      `- Verb: ${action.verb}`,
      `- Target: ${action.target}`,
      `- Risk: ${action.risk}`,
      `- Approval required: ${action.approvalRequired ? 'yes' : 'no'}`,
      `- Approver: ${action.approver ?? 'not assigned'}`,
      `- Rollback: ${action.rollback}`,
      ''
    );
  }

  appendList(lines, 'Warnings', receipt.warnings);
  appendList(lines, 'Errors', receipt.errors);
  return lines.join('\n').trimEnd();
}

function appendList(lines, title, items) {
  if (items.length === 0) return;
  lines.push(`## ${title}`, '');
  for (const item of items) lines.push(`- ${item}`);
  lines.push('');
}

export function renderJson(receipt) {
  return JSON.stringify(receipt, null, 2);
}
