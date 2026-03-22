import type { FlagConfig, SessionLog, UserAttributes } from '@/lib/fixtures/types';
import type {
  ComparisonOperator,
  ConditionTrace,
  EvaluationInput,
  FlagDecisionTrace,
  RuleTrace,
  SessionEvaluationTrace,
} from '@/lib/rules/types';

type ParsedCondition = {
  raw: string;
  attribute: string;
  operator: ComparisonOperator;
  expected: string | number | Array<string | number>;
};

const APP_VERSION_PATTERN = /^\d+(?:\.\d+)*$/;

function normalizeAttributeKey(attribute: string): string {
  return attribute.trim().toLowerCase();
}

function toNumberIfPossible(value: string): string | number {
  const trimmed = value.trim();
  const maybe = Number(trimmed);
  return Number.isFinite(maybe) && trimmed !== '' ? maybe : trimmed;
}

function parseCondition(rawCondition: string): ParsedCondition {
  const raw = rawCondition.trim();

  const inMatch = raw.match(/^([a-zA-Z0-9_]+)\s+in\s+\[(.*)\]$/);
  if (inMatch) {
    const items = inMatch[2]
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map(toNumberIfPossible);

    return {
      raw,
      attribute: normalizeAttributeKey(inMatch[1]),
      operator: 'in',
      expected: items,
    };
  }

  const binaryMatch = raw.match(/^([a-zA-Z0-9_]+)\s*(==|>=|<=)\s*(.+)$/);
  if (!binaryMatch) {
    throw new Error(`[rules-eval] Unsupported condition expression: ${rawCondition}`);
  }

  return {
    raw,
    attribute: normalizeAttributeKey(binaryMatch[1]),
    operator: binaryMatch[2] as ComparisonOperator,
    expected: toNumberIfPossible(binaryMatch[3]),
  };
}

function compareVersion(left: string, right: string): number {
  const leftParts = left.split('.').map((part) => Number(part));
  const rightParts = right.split('.').map((part) => Number(part));
  const maxLen = Math.max(leftParts.length, rightParts.length);

  for (let i = 0; i < maxLen; i += 1) {
    const l = leftParts[i] ?? 0;
    const r = rightParts[i] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }

  return 0;
}

function resolveAttribute(attribute: string, user: UserAttributes, session: SessionLog): string | number {
  switch (normalizeAttributeKey(attribute)) {
    case 'country':
      return user.country;
    case 'subscription_tier':
      return user.subscriptionTier;
    case 'account_age_days':
      return user.accountAgeDays;
    case 'app_version':
      return session.appVersion || user.appVersion;
    case 'cohort':
      return user.cohort;
    case 'region':
      return session.region;
    case 'device':
      return session.device;
    default:
      throw new Error(`[rules-eval] Unsupported attribute in condition: ${attribute}`);
  }
}

function isMatch(actual: string | number, expected: string | number, operator: ComparisonOperator): boolean {
  if (operator === '==') {
    return actual === expected;
  }

  if (typeof actual === 'number' && typeof expected === 'number') {
    return operator === '>=' ? actual >= expected : actual <= expected;
  }

  if (typeof actual === 'string' && typeof expected === 'string') {
    if (APP_VERSION_PATTERN.test(actual) && APP_VERSION_PATTERN.test(expected)) {
      const cmp = compareVersion(actual, expected);
      return operator === '>=' ? cmp >= 0 : cmp <= 0;
    }

    const cmp = actual.localeCompare(expected);
    return operator === '>=' ? cmp >= 0 : cmp <= 0;
  }

  return false;
}

function evaluateCondition(
  condition: ParsedCondition,
  user: UserAttributes,
  session: SessionLog,
): ConditionTrace {
  const actual = resolveAttribute(condition.attribute, user, session);

  if (condition.operator === 'in') {
    const expectedList = condition.expected as Array<string | number>;
    const matched = expectedList.includes(actual);
    return {
      raw: condition.raw,
      attribute: condition.attribute,
      operator: 'in',
      expected: expectedList,
      actual,
      matched,
      reason: matched
        ? `${condition.attribute}=${String(actual)} is in [${expectedList.join(', ')}]`
        : `${condition.attribute}=${String(actual)} is not in [${expectedList.join(', ')}]`,
    };
  }

  const expected = condition.expected as string | number;
  const matched = isMatch(actual, expected, condition.operator);

  return {
    raw: condition.raw,
    attribute: condition.attribute,
    operator: condition.operator,
    expected,
    actual,
    matched,
    reason: matched
      ? `${condition.attribute} ${condition.operator} ${String(expected)} matched with ${String(actual)}`
      : `${condition.attribute} ${condition.operator} ${String(expected)} did not match ${String(actual)}`,
  };
}

function evaluateRule(flag: FlagConfig, user: UserAttributes, session: SessionLog): RuleTrace[] {
  return flag.rules.map((rule) => {
    const evaluated = rule.conditions
      .map(parseCondition)
      .map((condition) => evaluateCondition(condition, user, session));

    const matchedConditions = evaluated.filter((trace) => trace.matched);
    const missedConditions = evaluated.filter((trace) => !trace.matched);

    return {
      ruleId: rule.id,
      description: rule.description,
      matched: missedConditions.length === 0,
      matchedConditions,
      missedConditions,
    };
  });
}

function getObservedOutcomeForFlag(session: SessionLog, flagKey: string): boolean | null {
  const candidates = session.events
    .filter((event) => event.flagKey === flagKey && event.outcome !== undefined)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const last = candidates.at(-1);
  if (!last?.outcome) {
    return null;
  }
  return last.outcome === 'on';
}

function evaluateFlag(flag: FlagConfig, user: UserAttributes, session: SessionLog): FlagDecisionTrace {
  const rules = evaluateRule(flag, user, session);

  const matchedRuleIds = rules.filter((rule) => rule.matched).map((rule) => rule.ruleId);
  const missedRuleIds = rules.filter((rule) => !rule.matched).map((rule) => rule.ruleId);

  const derivedConflict =
    matchedRuleIds.length === 0 &&
    rules.some((rule) => rule.matchedConditions.length > 0 && rule.missedConditions.length > 0);

  const replayConflict = session.events.some(
    (event) => event.type === 'conflict_detected' && event.flagKey === flag.key,
  );

  let decisionSource: FlagDecisionTrace['decisionSource'] = 'default';
  let decision = flag.defaultValue;

  if (flag.status === 'inactive') {
    decisionSource = 'inactive';
    decision = flag.defaultValue;
  } else if (matchedRuleIds.length > 0) {
    decisionSource = 'rule_match';
    decision = true;
  }

  const reasons: string[] = [];
  if (derivedConflict) {
    reasons.push('Derived partial rule match without a full match');
  }
  if (replayConflict) {
    reasons.push('Conflict event exists in replay log');
  }
  if (flag.status === 'inactive') {
    reasons.push('Flag is inactive; fallback to default value');
  }

  const observed = getObservedOutcomeForFlag(session, flag.key);
  const stale = observed !== null && observed !== decision;
  if (stale) {
    reasons.push(`Observed replay outcome (${observed ? 'on' : 'off'}) differs from evaluated decision (${decision ? 'on' : 'off'})`);
  }

  return {
    flagKey: flag.key,
    decision,
    decisionSource,
    matchedRuleIds,
    missedRuleIds,
    rules,
    marker: {
      conflict: derivedConflict || replayConflict,
      stale,
      reasons,
    },
  };
}

export function evaluateSessionRules(input: EvaluationInput, sessionId?: string): SessionEvaluationTrace {
  const session = sessionId
    ? input.sessions.find((item) => item.id === sessionId)
    : input.sessions[0];

  if (!session) {
    throw new Error('[rules-eval] Session not found for evaluation');
  }

  const user = input.users.find((item) => item.id === session.userId);
  if (!user) {
    throw new Error(`[rules-eval] Missing user attributes for session ${session.id}`);
  }

  const perFlag = input.flags
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((flag) => evaluateFlag(flag, user, session));

  return {
    session,
    user,
    evaluatedAt: new Date().toISOString(),
    perFlag,
  };
}
