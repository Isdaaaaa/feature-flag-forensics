import type { FlagConfig, SessionLog, UserAttributes } from '@/lib/fixtures/types';

export type ComparisonOperator = '==' | '>=' | '<=' | 'in';

export type ConditionTrace = {
  raw: string;
  attribute: string;
  operator: ComparisonOperator;
  expected: string | number | Array<string | number>;
  actual: string | number;
  matched: boolean;
  reason: string;
};

export type RuleTrace = {
  ruleId: string;
  description: string;
  matched: boolean;
  matchedConditions: ConditionTrace[];
  missedConditions: ConditionTrace[];
};

export type DecisionSource = 'rule_match' | 'default' | 'inactive';

export type DecisionMarker = {
  conflict: boolean;
  stale: boolean;
  reasons: string[];
};

export type FlagDecisionTrace = {
  flagKey: string;
  decision: boolean;
  decisionSource: DecisionSource;
  matchedRuleIds: string[];
  missedRuleIds: string[];
  rules: RuleTrace[];
  marker: DecisionMarker;
};

export type SessionEvaluationTrace = {
  session: SessionLog;
  user: UserAttributes;
  evaluatedAt: string;
  perFlag: FlagDecisionTrace[];
};

export type EvaluationInput = {
  flags: FlagConfig[];
  users: UserAttributes[];
  sessions: SessionLog[];
};
