const allowedRisk = new Set(['low', 'medium', 'high']);
const writeVerbs = new Set(['create', 'update', 'delete', 'send', 'invite', 'archive']);

export function buildReceipt(plan) {
  const errors = [];
  const warnings = [];
  const validPlan = isRecord(plan);
  const input = validPlan ? plan : {};
  const actions = Array.isArray(input.actions) ? input.actions : [];
  const name = requiredString(input, 'name', 'Plan name', 'Unnamed connector plan', errors);
  const owner = requiredString(input, 'owner', 'Plan owner', 'unknown', errors);
  const summary = optionalString(input, 'summary', '', 'Plan summary', errors);

  if (!validPlan) errors.push('Plan must be a JSON object.');
  if (validPlan && !Array.isArray(input.actions)) errors.push('Plan actions must be an array.');
  if (actions.length === 0) errors.push('Plan must include at least one action.');

  const normalized = actions.map((action, index) => normalizeAction(action, index, errors, warnings));
  const approvalRequired = normalized.some((action) => action.approvalRequired);
  const highestRisk = normalized.reduce((current, action) => riskRank(action.risk) > riskRank(current) ? action.risk : current, 'low');

  return {
    name,
    owner,
    generatedAt: new Date(0).toISOString(),
    summary,
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
  const fallbackId = `action-${index + 1}`;
  const id = optionalNonBlankString(input, 'id', fallbackId, `Action ${index + 1} id`, errors);
  const connector = requiredString(input, 'connector', `${id} connector`, 'unknown', errors);
  const verbToken = normalizeToken(input.verb);
  const verb = verbToken || 'unknown';
  const target = requiredString(input, 'target', `${id} target`, 'unknown', errors);
  const riskToken = normalizeToken(input.risk);
  const risk = allowedRisk.has(riskToken) ? riskToken : 'high';
  const requiresApproval = input.requiresApproval === true || risk === 'high' || writeVerbs.has(verb);
  const approver = optionalString(input, 'approver', null, `${id} approver`, errors);
  const rollback = optionalString(
    input,
    'rollback',
    'Manual review required before live execution.',
    `${id} rollback`,
    errors
  );
  const notes = optionalString(input, 'notes', '', `${id} notes`, errors);

  if (!validAction) errors.push(`Action ${index + 1} must be a JSON object.`);
  if (!hasNonBlankString(input, 'id')) warnings.push(`Action ${index + 1} is missing id; using ${id}.`);
  if (!verbToken) errors.push(`${id} is missing verb.`);
  if (!allowedRisk.has(riskToken)) warnings.push(`${id} has invalid or missing risk; treating as high.`);
  if (requiresApproval && !approver) warnings.push(`${id} requires approval but has no approver.`);

  return {
    id,
    connector,
    verb,
    target,
    risk,
    approvalRequired: requiresApproval,
    approver,
    rollback,
    notes
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeToken(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : undefined;
}

function hasNonBlankString(input, key) {
  return typeof input[key] === 'string' && input[key].trim().length > 0;
}

function requiredString(input, key, label, fallback, errors) {
  if (!Object.hasOwn(input, key) || input[key] === null || input[key] === '') {
    errors.push(`${label} must be a non-blank string.`);
    return fallback;
  }
  if (typeof input[key] !== 'string' || input[key].trim().length === 0) {
    errors.push(`${label} must be a non-blank string.`);
    return fallback;
  }
  return input[key].trim();
}

function optionalString(input, key, fallback, label, errors) {
  if (!Object.hasOwn(input, key) || input[key] === null) return fallback;
  if (typeof input[key] !== 'string') {
    errors.push(`${label} must be a string when provided.`);
    return fallback;
  }
  return input[key].trim();
}

function optionalNonBlankString(input, key, fallback, label, errors) {
  if (!Object.hasOwn(input, key) || input[key] === null || input[key] === '') return fallback;
  if (typeof input[key] !== 'string') {
    errors.push(`${label} must be a string when provided.`);
    return fallback;
  }
  if (input[key].trim().length === 0) return fallback;
  return input[key].trim();
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
