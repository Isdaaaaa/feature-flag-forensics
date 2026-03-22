export type FlagRule = {
  id: string;
  description: string;
  conditions: string[];
};

export type FlagConfig = {
  key: string;
  name: string;
  owner: string;
  environment: string;
  status: 'active' | 'inactive';
  defaultValue: boolean;
  rules: FlagRule[];
};

export type FlagConfigFixture = {
  datasetName: string;
  source: string;
  generatedAt: string;
  flags: FlagConfig[];
};

export type UserAttributes = {
  id: string;
  country: string;
  subscriptionTier: string;
  accountAgeDays: number;
  appVersion: string;
  cohort: string;
};

export type UserAttributesFixture = {
  datasetName: string;
  source: string;
  users: UserAttributes[];
};

export type SessionEventType = 'session_start' | 'flag_evaluated' | 'conflict_detected' | 'outcome_served';

export type SessionEvent = {
  id: string;
  timestamp: string;
  type: SessionEventType;
  title: string;
  detail: string;
  flagKey?: string;
  matchedAttributes?: string[];
  missedAttributes?: string[];
  outcome?: 'on' | 'off';
};

export type SessionLog = {
  id: string;
  userId: string;
  region: string;
  device: string;
  appVersion: string;
  timezone: string;
  startedAt: string;
  events: SessionEvent[];
};

export type SessionEventsFixture = {
  datasetName: string;
  source: string;
  sessions: SessionLog[];
};

export type FixtureMeta = {
  name: string;
  source: string;
  recordCount: number;
};

export type IngestedFixtureBundle = {
  metadata: FixtureMeta[];
  flags: FlagConfig[];
  users: UserAttributes[];
  sessions: SessionLog[];
};
