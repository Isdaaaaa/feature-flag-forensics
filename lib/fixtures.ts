import flagConfigsJson from '@/data/fixtures/flag-configs.json';
import sessionLogsJson from '@/data/fixtures/session-logs.json';
import userAttributesJson from '@/data/fixtures/user-attributes.json';

export type DecisionTone = 'matched' | 'missed' | 'conflict' | 'stale' | 'neutral';

type Condition = {
  attribute: string;
  operator: 'equals' | 'gte' | 'lte';
  value: string | number;
};

type Rule = {
  id: string;
  label: string;
  conditions: Condition[];
  outcome: 'ON' | 'OFF';
};

export type FlagConfig = {
  flag_key: string;
  description: string;
  default: 'ON' | 'OFF';
  rules: Rule[];
};

export type UserAttributes = {
  user_id: string;
  country: string;
  app_version: string;
  subscription_tier: string;
  account_age_days: number;
  fraud_risk: number;
};

export type SessionEvent = {
  at: string;
  title: string;
  detail: string;
  tone: DecisionTone;
};

export type SessionFlagOutcome = {
  flag_key: string;
  variant: 'ON' | 'OFF';
  state: DecisionTone;
};

export type SessionLog = {
  session_id: string;
  user_id: string;
  started_at: string;
  events: SessionEvent[];
  flag_outcomes: SessionFlagOutcome[];
};

export type FixtureBundle = {
  flags: FlagConfig[];
  users: UserAttributes[];
  sessions: SessionLog[];
  selected: {
    session: SessionLog;
    user: UserAttributes;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid fixture: expected non-empty string for ${field}`);
  }
  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid fixture: expected number for ${field}`);
  }
  return value;
}

function asArray<T = unknown>(value: unknown, field: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid fixture: expected array for ${field}`);
  }
  return value as T[];
}

function asTone(value: unknown, field: string): DecisionTone {
  const allowed: DecisionTone[] = ['matched', 'missed', 'conflict', 'stale', 'neutral'];
  const candidate = asString(value, field) as DecisionTone;
  if (!allowed.includes(candidate)) {
    throw new Error(`Invalid fixture: unsupported tone '${candidate}' in ${field}`);
  }
  return candidate;
}

function parseFlags(raw: unknown): FlagConfig[] {
  return asArray(raw, 'flag-configs').map((entry, i) => {
    if (!isObject(entry)) throw new Error(`Invalid flag config at index ${i}`);

    const rules = asArray(entry.rules, `flags[${i}].rules`).map((rule, rIdx) => {
      if (!isObject(rule)) throw new Error(`Invalid rule at flags[${i}].rules[${rIdx}]`);

      const conditions = asArray(rule.conditions, `flags[${i}].rules[${rIdx}].conditions`).map((c, cIdx) => {
        if (!isObject(c)) throw new Error(`Invalid condition at flags[${i}].rules[${rIdx}].conditions[${cIdx}]`);
        return {
          attribute: asString(c.attribute, `flags[${i}].rules[${rIdx}].conditions[${cIdx}].attribute`),
          operator: asString(c.operator, `flags[${i}].rules[${rIdx}].conditions[${cIdx}].operator`) as
            | 'equals'
            | 'gte'
            | 'lte',
          value: (typeof c.value === 'number' ? c.value : asString(c.value, `flags[${i}].rules[${rIdx}].conditions[${cIdx}].value`)) as
            | string
            | number,
        };
      });

      const outcome = asString(rule.outcome, `flags[${i}].rules[${rIdx}].outcome`) as 'ON' | 'OFF';

      return {
        id: asString(rule.id, `flags[${i}].rules[${rIdx}].id`),
        label: asString(rule.label, `flags[${i}].rules[${rIdx}].label`),
        conditions,
        outcome,
      };
    });

    return {
      flag_key: asString(entry.flag_key, `flags[${i}].flag_key`),
      description: asString(entry.description, `flags[${i}].description`),
      default: asString(entry.default, `flags[${i}].default`) as 'ON' | 'OFF',
      rules,
    };
  });
}

function parseUsers(raw: unknown): UserAttributes[] {
  return asArray(raw, 'user-attributes').map((entry, i) => {
    if (!isObject(entry)) throw new Error(`Invalid user attributes at index ${i}`);

    return {
      user_id: asString(entry.user_id, `users[${i}].user_id`),
      country: asString(entry.country, `users[${i}].country`),
      app_version: asString(entry.app_version, `users[${i}].app_version`),
      subscription_tier: asString(entry.subscription_tier, `users[${i}].subscription_tier`),
      account_age_days: asNumber(entry.account_age_days, `users[${i}].account_age_days`),
      fraud_risk: asNumber(entry.fraud_risk, `users[${i}].fraud_risk`),
    };
  });
}

function parseSessions(raw: unknown): SessionLog[] {
  return asArray(raw, 'session-logs').map((entry, i) => {
    if (!isObject(entry)) throw new Error(`Invalid session log at index ${i}`);

    const events = asArray(entry.events, `sessions[${i}].events`).map((event, eIdx) => {
      if (!isObject(event)) throw new Error(`Invalid event at sessions[${i}].events[${eIdx}]`);
      return {
        at: asString(event.at, `sessions[${i}].events[${eIdx}].at`),
        title: asString(event.title, `sessions[${i}].events[${eIdx}].title`),
        detail: asString(event.detail, `sessions[${i}].events[${eIdx}].detail`),
        tone: asTone(event.tone, `sessions[${i}].events[${eIdx}].tone`),
      };
    });

    const flag_outcomes = asArray(entry.flag_outcomes, `sessions[${i}].flag_outcomes`).map((outcome, oIdx) => {
      if (!isObject(outcome)) throw new Error(`Invalid flag outcome at sessions[${i}].flag_outcomes[${oIdx}]`);
      return {
        flag_key: asString(outcome.flag_key, `sessions[${i}].flag_outcomes[${oIdx}].flag_key`),
        variant: asString(outcome.variant, `sessions[${i}].flag_outcomes[${oIdx}].variant`) as 'ON' | 'OFF',
        state: asTone(outcome.state, `sessions[${i}].flag_outcomes[${oIdx}].state`),
      };
    });

    return {
      session_id: asString(entry.session_id, `sessions[${i}].session_id`),
      user_id: asString(entry.user_id, `sessions[${i}].user_id`),
      started_at: asString(entry.started_at, `sessions[${i}].started_at`),
      events,
      flag_outcomes,
    };
  });
}

export function formatUtcTime(timestamp: string): string {
  const d = new Date(timestamp);
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  const s = d.getUTCSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s} UTC`;
}

export function loadFixtureBundle(): FixtureBundle {
  const flags = parseFlags(flagConfigsJson);
  const users = parseUsers(userAttributesJson);
  const sessions = parseSessions(sessionLogsJson);

  const selectedSession = sessions[0];
  if (!selectedSession) {
    throw new Error('No session fixtures found.');
  }

  const selectedUser = users.find((u) => u.user_id === selectedSession.user_id);
  if (!selectedUser) {
    throw new Error(`Missing user fixture for session ${selectedSession.session_id}`);
  }

  return {
    flags,
    users,
    sessions,
    selected: {
      session: selectedSession,
      user: selectedUser,
    },
  };
}
