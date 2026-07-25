const allowedRisk = new Set(['low', 'medium', 'high']);
const writeVerbs = new Set(['create', 'update', 'delete', 'send', 'invite', 'archive']);

export function buildReceipt(plan) {
  const errors = [];
  const warnings = [];
  const validPlan = isRecord(plan);
  const input = validPlan ? plan : {};
  const actions = Array.isArray(input.actions) ? input.actions : [];

  if (!validPlan) errors.push('Plan must be a JSON object.');
  if (!input.name) errors.push('Plan is missing name.');
  if (!input.owner) errors.push('Plan is missing owner.');
  if (validPlan && !Array.isArray(input.actions)) errors.push('Plan actions must be an array.');
  if (actions.length === 0) errors.push('Plan must include at least one action.');

  const normalized = actions.map((action, index) => normalizeAction(action, index, errors, warnings));
  const approvalRequired = normalized.some((action) => action.approvalRequired);
  const highestRisk = normalized.reduce((current, action) => riskRank(action.risk) > riskRank(current) ? action.risk : current, 'low');

  return {
    name: input.name ?? 'Unnamed connector plan',
    owner: input.owner ?? 'unknown',
    generatedAt: new Date(0).toISOString(),
    summary: input.summary ?? '',
    approvalRequired,
    highestRisk,
    actions: normalized,
    warnings,
    errors
  };
}

function normalizeAction(action, index, errors, warnings) {
  const validAction = isRecord(action);
  const input = validAction ? action : {};
  const id = input.id ?? `action-${index + 1}`;
  const connector = input.connector ?? 'unknown';
  const verbToken = normalizeToken(input.verb);
  const verb = verbToken || 'unknown';
  const target = input.target ?? 'unknown';
  const riskToken = normalizeToken(input.risk);
  const risk = allowedRisk.has(riskToken) ? riskToken : 'high';
  const requiresApproval = input.requiresApproval === true || risk === 'high' || writeVerbs.has(verb);

  if (!validAction) errors.push(`Action ${index + 1} must be a JSON object.`);
  if (!input.id) warnings.push(`Action ${index + 1} is missing id; using ${id}.`);
  if (!input.connector) errors.push(`${id} is missing connector.`);
  if (!verbToken) errors.push(`${id} is missing verb.`);
  if (!input.target) errors.push(`${id} is missing target.`);
  if (!allowedRisk.has(riskToken)) warnings.push(`${id} has invalid or missing risk; treating as high.`);
  if (requiresApproval && !input.approver) warnings.push(`${id} requires approval but has no approver.`);

  return {
    id,
    connector,
    verb,
    target,
    risk,
    approvalRequired: requiresApproval,
    approver: input.approver ?? null,
    rollback: input.rollback ?? 'Manual review required before live execution.',
    notes: input.notes ?? ''
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeToken(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : undefined;
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
