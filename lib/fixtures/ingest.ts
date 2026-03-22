import flagConfigsRaw from '@/fixtures/flag-configs.json';
import sessionEventsRaw from '@/fixtures/session-events.json';
import userAttributesRaw from '@/fixtures/user-attributes.json';
import type {
  FlagConfig,
  FlagConfigFixture,
  IngestedFixtureBundle,
  SessionEvent,
  SessionEventsFixture,
  SessionEventType,
  SessionLog,
  UserAttributes,
  UserAttributesFixture,
} from '@/lib/fixtures/types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function fail(message: string): never {
  throw new Error(`[fixture-ingestion] ${message}`);
}

function ensureIsoTimestamp(value: unknown, field: string): string {
  if (!isString(value) || Number.isNaN(Date.parse(value))) {
    fail(`${field} must be a valid timestamp string`);
  }
  return value;
}

function parseFlagConfig(input: unknown, index: number): FlagConfig {
  if (!isObject(input)) {
    fail(`flags[${index}] must be an object`);
  }

  if (!Array.isArray(input.rules)) {
    fail(`flags[${index}].rules must be an array`);
  }

  const rules = input.rules.map((rule, ruleIndex) => {
    if (!isObject(rule)) {
      fail(`flags[${index}].rules[${ruleIndex}] must be an object`);
    }
    if (!isString(rule.id) || !isString(rule.description) || !isStringArray(rule.conditions)) {
      fail(`flags[${index}].rules[${ruleIndex}] has invalid fields`);
    }
    return {
      id: rule.id,
      description: rule.description,
      conditions: rule.conditions,
    };
  });

  if (
    !isString(input.key) ||
    !isString(input.name) ||
    !isString(input.owner) ||
    !isString(input.environment) ||
    !isString(input.status) ||
    !isBoolean(input.defaultValue)
  ) {
    fail(`flags[${index}] has invalid fields`);
  }

  if (input.status !== 'active' && input.status !== 'inactive') {
    fail(`flags[${index}].status must be active or inactive`);
  }

  return {
    key: input.key,
    name: input.name,
    owner: input.owner,
    environment: input.environment,
    status: input.status,
    defaultValue: input.defaultValue,
    rules,
  };
}

function parseFlagFixture(input: unknown): FlagConfigFixture {
  if (!isObject(input)) {
    fail('flag fixture must be an object');
  }
  if (!isString(input.datasetName) || !isString(input.source)) {
    fail('flag fixture missing dataset metadata');
  }
  const generatedAt = ensureIsoTimestamp(input.generatedAt, 'flag fixture generatedAt');
  if (!Array.isArray(input.flags)) {
    fail('flag fixture flags must be an array');
  }

  return {
    datasetName: input.datasetName,
    source: input.source,
    generatedAt,
    flags: input.flags.map(parseFlagConfig),
  };
}

function parseUser(input: unknown, index: number): UserAttributes {
  if (!isObject(input)) {
    fail(`users[${index}] must be an object`);
  }

  if (
    !isString(input.id) ||
    !isString(input.country) ||
    !isString(input.subscriptionTier) ||
    !isNumber(input.accountAgeDays) ||
    !isString(input.appVersion) ||
    !isString(input.cohort)
  ) {
    fail(`users[${index}] has invalid fields`);
  }

  return {
    id: input.id,
    country: input.country,
    subscriptionTier: input.subscriptionTier,
    accountAgeDays: input.accountAgeDays,
    appVersion: input.appVersion,
    cohort: input.cohort,
  };
}

function parseUserFixture(input: unknown): UserAttributesFixture {
  if (!isObject(input)) {
    fail('user fixture must be an object');
  }
  if (!isString(input.datasetName) || !isString(input.source)) {
    fail('user fixture missing dataset metadata');
  }
  if (!Array.isArray(input.users)) {
    fail('user fixture users must be an array');
  }

  return {
    datasetName: input.datasetName,
    source: input.source,
    users: input.users.map(parseUser),
  };
}

function parseSessionEvent(input: unknown, sessionIndex: number, eventIndex: number): SessionEvent {
  if (!isObject(input)) {
    fail(`sessions[${sessionIndex}].events[${eventIndex}] must be an object`);
  }

  if (
    !isString(input.id) ||
    !isString(input.type) ||
    !isString(input.title) ||
    !isString(input.detail)
  ) {
    fail(`sessions[${sessionIndex}].events[${eventIndex}] missing required fields`);
  }

  const sessionEventTypes: SessionEventType[] = [
    'session_start',
    'flag_evaluated',
    'conflict_detected',
    'outcome_served',
  ];
  if (!sessionEventTypes.includes(input.type as SessionEventType)) {
    fail(`sessions[${sessionIndex}].events[${eventIndex}] has unknown type`);
  }

  const eventType = input.type as SessionEventType;

  const output: SessionEvent = {
    id: input.id,
    timestamp: ensureIsoTimestamp(input.timestamp, `sessions[${sessionIndex}].events[${eventIndex}].timestamp`),
    type: eventType,
    title: input.title,
    detail: input.detail,
  };

  if (input.flagKey !== undefined) {
    if (!isString(input.flagKey)) {
      fail(`sessions[${sessionIndex}].events[${eventIndex}].flagKey must be a string`);
    }
    output.flagKey = input.flagKey;
  }

  if (input.matchedAttributes !== undefined) {
    if (!isStringArray(input.matchedAttributes)) {
      fail(`sessions[${sessionIndex}].events[${eventIndex}].matchedAttributes must be a string array`);
    }
    output.matchedAttributes = input.matchedAttributes;
  }

  if (input.missedAttributes !== undefined) {
    if (!isStringArray(input.missedAttributes)) {
      fail(`sessions[${sessionIndex}].events[${eventIndex}].missedAttributes must be a string array`);
    }
    output.missedAttributes = input.missedAttributes;
  }

  if (input.outcome !== undefined) {
    if (input.outcome !== 'on' && input.outcome !== 'off') {
      fail(`sessions[${sessionIndex}].events[${eventIndex}].outcome must be on or off`);
    }
    output.outcome = input.outcome;
  }

  return output;
}

function parseSession(input: unknown, index: number): SessionLog {
  if (!isObject(input)) {
    fail(`sessions[${index}] must be an object`);
  }

  if (!Array.isArray(input.events)) {
    fail(`sessions[${index}].events must be an array`);
  }

  if (
    !isString(input.id) ||
    !isString(input.userId) ||
    !isString(input.region) ||
    !isString(input.device) ||
    !isString(input.appVersion) ||
    !isString(input.timezone)
  ) {
    fail(`sessions[${index}] missing required fields`);
  }

  return {
    id: input.id,
    userId: input.userId,
    region: input.region,
    device: input.device,
    appVersion: input.appVersion,
    timezone: input.timezone,
    startedAt: ensureIsoTimestamp(input.startedAt, `sessions[${index}].startedAt`),
    events: input.events.map((event, eventIndex) => parseSessionEvent(event, index, eventIndex)),
  };
}

function parseSessionFixture(input: unknown): SessionEventsFixture {
  if (!isObject(input)) {
    fail('session fixture must be an object');
  }
  if (!isString(input.datasetName) || !isString(input.source)) {
    fail('session fixture missing dataset metadata');
  }
  if (!Array.isArray(input.sessions)) {
    fail('session fixture sessions must be an array');
  }

  return {
    datasetName: input.datasetName,
    source: input.source,
    sessions: input.sessions.map(parseSession),
  };
}

export function ingestFixtures(): IngestedFixtureBundle {
  const flagFixture = parseFlagFixture(flagConfigsRaw);
  const userFixture = parseUserFixture(userAttributesRaw);
  const sessionFixture = parseSessionFixture(sessionEventsRaw);

  return {
    metadata: [
      {
        name: flagFixture.datasetName,
        source: flagFixture.source,
        recordCount: flagFixture.flags.length,
      },
      {
        name: userFixture.datasetName,
        source: userFixture.source,
        recordCount: userFixture.users.length,
      },
      {
        name: sessionFixture.datasetName,
        source: sessionFixture.source,
        recordCount: sessionFixture.sessions.length,
      },
    ],
    flags: flagFixture.flags,
    users: userFixture.users,
    sessions: sessionFixture.sessions,
  };
}
