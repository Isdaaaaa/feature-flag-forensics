import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ingestFixtures } from '@/lib/fixtures/ingest';
import { evaluateSessionRules } from '@/lib/rules/evaluate';
import type { ConditionTrace } from '@/lib/rules/types';

type BadgeTone = 'matched' | 'missed' | 'conflict' | 'stale' | 'neutral';

type EvidenceItem = {
  id: string;
  label: string;
  detail: string;
  tone: BadgeTone;
};

function toneFromEvent(type: string, outcome?: 'on' | 'off'): BadgeTone {
  if (type === 'conflict_detected') return 'conflict';
  if (type === 'flag_evaluated') return outcome === 'on' ? 'matched' : 'missed';
  if (type === 'outcome_served') return outcome === 'on' ? 'matched' : 'conflict';
  return 'neutral';
}

function conditionTone(condition: ConditionTrace): BadgeTone {
  return condition.matched ? 'matched' : 'missed';
}

function formatTimeInZone(timestamp: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).formatToParts(new Date(timestamp));

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.hour}:${valueByType.minute}:${valueByType.second} ${valueByType.timeZoneName ?? ''}`.trim();
}

function formatTimezoneLabel(timestamp: string, timezone: string): string {
  const zoneName = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  })
    .formatToParts(new Date(timestamp))
    .find((part) => part.type === 'timeZoneName')?.value;

  let offset = '';
  try {
    offset =
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'longOffset',
      })
        .formatToParts(new Date(timestamp))
        .find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    offset = zoneName ?? '';
  }

  return `${timezone}${zoneName ? ` (${zoneName}` : ''}${offset && offset !== zoneName ? ` · ${offset}` : ''}${zoneName ? ')' : ''}`;
}

function toEvidenceId(raw: string): string {
  return `evidence-${raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export default function HomePage() {
  const fixtures = ingestFixtures();
  const selectedSession = fixtures.sessions[0];
  const selectedUser = fixtures.users.find((user) => user.id === selectedSession?.userId);
  const evaluation = evaluateSessionRules(fixtures, selectedSession?.id);

  const timelineItems =
    selectedSession?.events.map((event) => ({
      key: event.id,
      time: formatTimeInZone(event.timestamp, selectedSession.timezone),
      title: event.title,
      detail: event.detail,
      tone: toneFromEvent(event.type, event.outcome),
      evidence: [...(event.matchedAttributes ?? []), ...(event.missedAttributes ?? [])],
    })) ?? [];

  const primaryFlag = evaluation.perFlag[0];
  const allConditions = primaryFlag?.rules.flatMap((rule) => [...rule.matchedConditions, ...rule.missedConditions]) ?? [];

  const evidenceItems: EvidenceItem[] = allConditions.map((condition) => {
    const expected = Array.isArray(condition.expected) ? condition.expected.join(', ') : String(condition.expected);
    return {
      id: toEvidenceId(`${condition.attribute}-${String(condition.actual)}-${expected}`),
      label: `${condition.attribute}=${String(condition.actual)}`,
      detail: `${condition.operator} ${expected} · ${condition.reason}`,
      tone: conditionTone(condition),
    };
  });

  const matchedConditions = allConditions.filter((condition) => condition.matched);
  const missedConditions = allConditions.filter((condition) => !condition.matched);

  const explanationItems = [
    {
      title: 'Matched rule conditions',
      body: matchedConditions.length
        ? `${matchedConditions.length} condition${matchedConditions.length > 1 ? 's' : ''} matched for ${primaryFlag?.flagKey ?? 'the selected flag'}.`
        : 'No conditions matched for the selected flag.',
      tone: 'matched' as BadgeTone,
      conditions: matchedConditions,
    },
    {
      title: 'Missed rule conditions',
      body: missedConditions.length
        ? `${missedConditions.length} condition${missedConditions.length > 1 ? 's' : ''} blocked full rollout.`
        : 'No missed conditions were found for the selected flag.',
      tone: missedConditions.length ? ('conflict' as BadgeTone) : ('neutral' as BadgeTone),
      conditions: missedConditions,
    },
    {
      title: 'Final evaluated outcome',
      body: primaryFlag
        ? `${primaryFlag.flagKey} resolved ${primaryFlag.decision ? 'ON' : 'OFF'} (${primaryFlag.decisionSource}).`
        : 'No evaluated decision was produced.',
      tone: primaryFlag?.decision ? ('matched' as BadgeTone) : ('conflict' as BadgeTone),
      conditions: [],
    },
  ];

  const servedOutcomes = selectedSession?.events.filter((event) => event.type === 'outcome_served') ?? [];
  const onOutcomes = selectedSession?.events.filter((event) => event.outcome === 'on') ?? [];
  const conflictCount = evaluation.perFlag.filter((flag) => flag.marker.conflict).length;
  const staleCount = evaluation.perFlag.filter((flag) => flag.marker.stale).length;
  const timezoneLabel = selectedSession
    ? formatTimezoneLabel(selectedSession.startedAt, selectedSession.timezone)
    : 'timezone unavailable';

  return (
    <main className="min-h-screen bg-[#071226] font-[Inter] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-8">
        <header className="rounded-2xl border border-cyan/20 bg-[#0B1E39] p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Feature Flag Forensics</p>
              <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">Session-level decision trace</h1>
              <p className="mt-1 text-xs text-slate-300">{timezoneLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-full border border-cyan/40 bg-cyan/15 px-3 py-1.5 text-sm font-medium text-cyan">
                Session Trace
              </button>
              <button className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200">
                Graph
              </button>
            </div>
          </div>
        </header>

        <section className="sticky top-3 z-10 rounded-2xl border border-white/15 bg-[#0E2748]/95 p-3 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge label={selectedUser?.id ?? 'user_unknown'} />
            <Badge label={selectedSession?.id ?? 'session_unknown'} />
            <Badge label={selectedSession ? `timezone=${selectedSession.timezone}` : 'timezone=n/a'} tone="neutral" />
            <Badge
              label={`trace_events=${selectedSession?.events.length ?? 0}`}
              tone={selectedSession?.events.length ? 'matched' : 'neutral'}
            />
            <Badge label={`flags=${fixtures.flags.length}`} tone="neutral" />
            <Badge label={`outcomes_on=${onOutcomes.length}`} tone="matched" />
            <Badge label={`outcomes_served=${servedOutcomes.length}`} tone="conflict" />
            <Badge label={`conflicts=${conflictCount}`} tone={conflictCount > 0 ? 'conflict' : 'neutral'} />
            <Badge label={`stale=${staleCount}`} tone={staleCount > 0 ? 'stale' : 'neutral'} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <Card title="Fixtures" subtitle="Dataset and metadata drawer">
              <ul className="space-y-2 text-sm text-slate-200">
                {fixtures.metadata.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-white/20 bg-white/5 p-3 text-slate-300">
                    No fixture metadata loaded.
                  </li>
                ) : (
                  fixtures.metadata.map((fixture) => (
                    <li key={fixture.name} className="rounded-xl border border-white/10 bg-white/5 p-2">
                      <p className="font-medium text-white">{fixture.name}</p>
                      <p className="text-xs text-slate-300">source: {fixture.source}</p>
                      <p className="mt-1 text-xs text-slate-300">records: {fixture.recordCount}</p>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-3 rounded-xl border border-dashed border-white/25 p-3 text-xs text-slate-300">
                Selected session: {selectedSession?.id ?? 'none'}
                <br />
                User: {selectedSession?.userId ?? 'unknown'}
                <br />
                Region/device: {selectedSession ? `${selectedSession.region} / ${selectedSession.device}` : 'n/a'}
              </div>
            </Card>

            <Card title="Export" subtitle="Support-ready handoff" className="mt-4">
              <p className="text-sm text-slate-200">
                Generate a concise incident summary with timestamps, matched rules, and evidence links.
              </p>
              <p className="mt-2 text-xs text-slate-300">
                Ready with {selectedSession?.events.length ?? 0} events and {evidenceItems.length} evidence link
                {evidenceItems.length === 1 ? '' : 's'}.
              </p>
              <button className="mt-3 w-full rounded-xl border border-amber/50 bg-amber/20 px-3 py-2 text-sm font-semibold text-amber">
                Export report (placeholder)
              </button>
            </Card>
          </aside>

          <div className="grid grid-cols-1 gap-4 lg:col-span-9 xl:grid-cols-2">
            <Card title="Timeline trace" subtitle={`Ordered rule decisions and events · ${timezoneLabel}`}>
              {selectedSession ? (
                timelineItems.length > 0 ? (
                  <ul className="space-y-3">
                    {timelineItems.map((item) => (
                      <li key={item.key} className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <Badge label={item.time} tone={item.tone} />
                        </div>
                        <p className="text-sm text-slate-300">{item.detail}</p>
                        {item.evidence.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.evidence.map((entry) => (
                              <a
                                key={`${item.key}-${entry}`}
                                href={`#${toEvidenceId(entry)}`}
                                className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-1 text-xs text-cyan transition hover:bg-cyan/20"
                              >
                                {entry}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-300">
                    No timeline events in the selected session.
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-dashed border-cyan/40 bg-cyan/10 p-4 text-sm text-cyan">
                  Loading session timeline…
                </div>
              )}
            </Card>

            <Card title="Decision explanations" subtitle="Why this outcome happened">
              <div className="space-y-3">
                {selectedSession ? (
                  explanationItems.map((item) => (
                    <article key={item.title} className="rounded-xl border border-white/15 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                        <Badge label={item.tone} tone={item.tone} />
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{item.body}</p>
                      {item.conditions.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {item.conditions.map((condition) => {
                            const expected = Array.isArray(condition.expected)
                              ? condition.expected.join(', ')
                              : String(condition.expected);
                            return (
                              <li
                                key={`${item.title}-${condition.raw}`}
                                className="rounded-lg border border-white/10 bg-[#0B1E39]/70 p-2"
                              >
                                <a
                                  href={`#${toEvidenceId(`${condition.attribute}-${String(condition.actual)}-${expected}`)}`}
                                  className="text-xs font-medium text-cyan underline-offset-2 hover:underline"
                                >
                                  evidence: {condition.attribute}={String(condition.actual)}
                                </a>
                                <p className="mt-1 text-xs text-slate-300">{condition.reason}</p>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="space-y-2">
                    <div className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/5" />
                    <div className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/5" />
                    <div className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/5" />
                  </div>
                )}
              </div>

              {evidenceItems.length > 0 ? (
                <div className="mt-4 rounded-xl border border-cyan/25 bg-[#0B1E39]/70 p-4">
                  <h3 className="text-sm font-semibold text-white">Evidence links (attribute/value)</h3>
                  <ul className="mt-2 space-y-2">
                    {evidenceItems.map((item) => (
                      <li key={item.id} id={item.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-cyan">{item.label}</p>
                          <Badge label={item.tone} tone={item.tone} />
                        </div>
                        <p className="mt-1 text-xs text-slate-300">{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-white/20 p-4 text-sm text-slate-300">
                  No evidence links were produced for the selected session.
                </div>
              )}
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
