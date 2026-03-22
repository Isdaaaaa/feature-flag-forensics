'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ingestFixtures } from '@/lib/fixtures/ingest';
import type { FlagConfig } from '@/lib/fixtures/types';
import { evaluateSessionRules } from '@/lib/rules/evaluate';
import type { ConditionTrace } from '@/lib/rules/types';

type BadgeTone = 'matched' | 'missed' | 'conflict' | 'stale' | 'neutral';
type TopTab = 'trace' | 'graph';

type EvidenceItem = {
  id: string;
  label: string;
  detail: string;
  tone: BadgeTone;
};

type GraphNode = {
  id: string;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  tone: BadgeTone;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  tone: BadgeTone;
  isConflict: boolean;
};

type ExportFeedbackTone = 'success' | 'warning';

type ExportFeedback = {
  tone: ExportFeedbackTone;
  message: string;
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

function getDependencyEdges(flags: FlagConfig[]): Array<{ from: string; to: string; label: string }> {
  const edges: Array<{ from: string; to: string; label: string }> = [];

  for (const flag of flags) {
    for (const rule of flag.rules) {
      for (const condition of rule.conditions) {
        const normalized = condition.toLowerCase();
        const dependency = flags.find(
          (candidate) => candidate.key !== flag.key && normalized.includes(candidate.key.toLowerCase()),
        );

        if (dependency) {
          edges.push({
            from: dependency.key,
            to: flag.key,
            label: `depends on ${dependency.key}`,
          });
        }
      }
    }
  }

  const deduped = new Map<string, { from: string; to: string; label: string }>();
  for (const edge of edges) {
    deduped.set(`${edge.from}->${edge.to}`, edge);
  }

  return [...deduped.values()];
}

function buildGraph(
  flagKeys: string[],
  conflictFlags: Set<string>,
  dependencies: Array<{ from: string; to: string; label: string }>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (flagKeys.length === 0) return { nodes: [], edges: [] };

  const leftX = 200;
  const rightX = 700;
  const yStart = 90;
  const yStep = flagKeys.length > 1 ? Math.floor(320 / (flagKeys.length - 1)) : 120;

  const nodes: GraphNode[] = [
    {
      id: 'session-entry',
      label: 'Session Entry',
      subtitle: 'trace replay start',
      x: leftX,
      y: 40,
      tone: 'neutral',
    },
  ];

  flagKeys.forEach((key, index) => {
    nodes.push({
      id: key,
      label: key,
      subtitle: conflictFlags.has(key) ? 'conflict observed' : 'clean rollout path',
      x: rightX,
      y: yStart + index * yStep,
      tone: conflictFlags.has(key) ? 'conflict' : 'matched',
    });
  });

  const rolloutEdges: GraphEdge[] = flagKeys.map((flagKey, index) => ({
    id: `rollout-${flagKey}`,
    from: 'session-entry',
    to: flagKey,
    label: `rollout ${index + 1}`,
    tone: conflictFlags.has(flagKey) ? 'conflict' : 'matched',
    isConflict: conflictFlags.has(flagKey),
  }));

  const dependencyEdges: GraphEdge[] = dependencies
    .filter((edge) => flagKeys.includes(edge.from) && flagKeys.includes(edge.to))
    .map((edge) => ({
      id: `dep-${edge.from}-${edge.to}`,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      tone: conflictFlags.has(edge.from) || conflictFlags.has(edge.to) ? 'conflict' : 'neutral',
      isConflict: conflictFlags.has(edge.from) || conflictFlags.has(edge.to),
    }));

  return {
    nodes,
    edges: [...rolloutEdges, ...dependencyEdges],
  };
}

function buildSupportReport(params: {
  generatedAt: string;
  timezoneLabel: string;
  sessionId: string;
  sessionStartedAt: string;
  userId: string;
  region: string;
  device: string;
  totalEvents: number;
  totalFlags: number;
  conflictCount: number;
  staleCount: number;
  outcomesOn: number;
  outcomesServed: number;
  timelineHighlights: Array<{ time: string; title: string; detail: string; tone: BadgeTone }>;
  flagOutcomes: Array<{ flagKey: string; decision: boolean; decisionSource: string; conflict: boolean; stale: boolean }>;
  evidence: EvidenceItem[];
}): string {
  const timelineSection = params.timelineHighlights.length
    ? params.timelineHighlights
        .map(
          (item, index) =>
            `${index + 1}. [${item.time}] ${item.title} (${item.tone})\n   ${item.detail}`,
        )
        .join('\n')
    : 'None.';

  const outcomeSection = params.flagOutcomes.length
    ? params.flagOutcomes
        .map(
          (flag) =>
            `- ${flag.flagKey}: ${flag.decision ? 'ON' : 'OFF'} via ${flag.decisionSource}${
              flag.conflict ? ' · conflict' : ''
            }${flag.stale ? ' · stale' : ''}`,
        )
        .join('\n')
    : '- No evaluated flags.';

  const evidenceSection = params.evidence.length
    ? params.evidence
        .map((item) => `- ${item.label} (${item.tone})\n  ${item.detail}\n  Link: #${item.id}`)
        .join('\n')
    : '- No evidence links generated.';

  return [
    'Feature Flag Forensics — Support Report',
    '',
    `Generated: ${params.generatedAt}`,
    `Timezone: ${params.timezoneLabel}`,
    '',
    'Session Summary',
    `- Session ID: ${params.sessionId}`,
    `- User ID: ${params.userId}`,
    `- Started At: ${params.sessionStartedAt}`,
    `- Region / Device: ${params.region} / ${params.device}`,
    '',
    'Key Outcomes',
    `- Trace events: ${params.totalEvents}`,
    `- Evaluated flags: ${params.totalFlags}`,
    `- Outcomes ON: ${params.outcomesOn}`,
    `- Outcomes served: ${params.outcomesServed}`,
    `- Conflict count: ${params.conflictCount}`,
    `- Stale count: ${params.staleCount}`,
    '',
    'Per-flag decisions',
    outcomeSection,
    '',
    'Timeline Highlights',
    timelineSection,
    '',
    'Evidence Links',
    evidenceSection,
  ].join('\n');
}

const nodeToneClasses: Record<BadgeTone, string> = {
  matched: 'fill-cyan/20 stroke-cyan',
  missed: 'fill-slate-100/10 stroke-slate-200',
  conflict: 'fill-amber/20 stroke-amber',
  stale: 'fill-fuchsia-300/15 stroke-fuchsia-200',
  neutral: 'fill-white/10 stroke-white/40',
};

const edgeToneClasses: Record<BadgeTone, string> = {
  matched: 'stroke-cyan/80',
  missed: 'stroke-slate-300/60',
  conflict: 'stroke-amber',
  stale: 'stroke-fuchsia-200',
  neutral: 'stroke-white/40',
};

function GraphPanel({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/25 bg-white/5 p-4 text-sm text-slate-300">
        No graphable flag events for this session.
      </div>
    );
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-white/15 bg-[#0B1E39]/70 p-3">
        <svg viewBox="0 0 900 420" className="h-[360px] min-w-[720px] w-full" role="img" aria-label="Feature dependency and rollout graph">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
              <path d="M0,0 L10,4 L0,8 z" className="fill-current text-white/60" />
            </marker>
            <marker id="arrow-conflict" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
              <path d="M0,0 L10,4 L0,8 z" className="fill-current text-amber" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;

            const startX = from.x + 88;
            const startY = from.y + 28;
            const endX = to.x - 8;
            const endY = to.y + 28;
            const controlX = (startX + endX) / 2;
            const path = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;

            return (
              <g key={edge.id}>
                <path
                  d={path}
                  className={`${edgeToneClasses[edge.tone]} fill-none`}
                  strokeWidth={edge.isConflict ? 2.5 : 2}
                  strokeDasharray={edge.id.startsWith('dep-') ? '6 6' : undefined}
                  markerEnd={`url(#${edge.isConflict ? 'arrow-conflict' : 'arrow'})`}
                />
                <text
                  x={controlX}
                  y={(startY + endY) / 2 - 8}
                  textAnchor="middle"
                  className={`text-[11px] font-medium ${edge.isConflict ? 'fill-amber' : 'fill-slate-300'}`}
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {nodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width="176"
                height="56"
                rx="12"
                className={`${nodeToneClasses[node.tone]} stroke-[1.5]`}
              />
              <text x={node.x + 12} y={node.y + 24} className="fill-white text-[12px] font-semibold">
                {node.label}
              </text>
              <text x={node.x + 12} y={node.y + 40} className="fill-slate-300 text-[10px]">
                {node.subtitle}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge label="solid edge = rollout" tone="matched" />
        <Badge label="dashed edge = dependency" tone="neutral" />
        <Badge label="amber edge = conflict" tone="conflict" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TopTab>('trace');
  const [copyFeedback, setCopyFeedback] = useState<ExportFeedback | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<ExportFeedback | null>(null);
  const [showManualCopy, setShowManualCopy] = useState(false);

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

  const graph = useMemo(() => {
    const evaluatedFlagOrder =
      selectedSession?.events
        .filter((event) => event.type === 'flag_evaluated' && event.flagKey)
        .map((event) => event.flagKey as string) ?? [];

    const uniqueFlagOrder = [...new Set(evaluatedFlagOrder)];
    const conflictFlags = new Set(
      evaluation.perFlag.filter((flag) => flag.marker.conflict).map((flag) => flag.flagKey),
    );

    return buildGraph(uniqueFlagOrder, conflictFlags, getDependencyEdges(fixtures.flags));
  }, [evaluation.perFlag, fixtures.flags, selectedSession?.events]);

  const reportText = selectedSession
    ? buildSupportReport({
        generatedAt: new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'medium',
          timeZone: selectedSession.timezone,
        }).format(new Date()),
        timezoneLabel,
        sessionId: selectedSession.id,
        sessionStartedAt: formatTimeInZone(selectedSession.startedAt, selectedSession.timezone),
        userId: selectedSession.userId,
        region: selectedSession.region,
        device: selectedSession.device,
        totalEvents: selectedSession.events.length,
        totalFlags: evaluation.perFlag.length,
        conflictCount,
        staleCount,
        outcomesOn: onOutcomes.length,
        outcomesServed: servedOutcomes.length,
        timelineHighlights: timelineItems.slice(0, 5),
        flagOutcomes: evaluation.perFlag.map((flag) => ({
          flagKey: flag.flagKey,
          decision: flag.decision,
          decisionSource: flag.decisionSource,
          conflict: flag.marker.conflict,
          stale: flag.marker.stale,
        })),
        evidence: evidenceItems.slice(0, 12),
      })
    : 'No session selected. Unable to generate report.';

  const handleCopyReport = async () => {
    if (!reportText) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(reportText);
      setShowManualCopy(false);
      setCopyFeedback({ tone: 'success', message: 'Copied report to clipboard.' });
    } catch {
      setShowManualCopy(true);
      setCopyFeedback({
        tone: 'warning',
        message: 'Clipboard blocked. Use the manual text area below to copy the report.',
      });
    }
  };

  const handleDownloadReport = () => {
    if (!reportText) return;

    const slug = selectedSession?.id ?? 'session-report';
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `${slug}-support-report.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
    setDownloadFeedback({ tone: 'success', message: `Downloaded ${anchor.download}.` });
  };

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
              <button
                onClick={() => setActiveTab('trace')}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === 'trace'
                    ? 'border-cyan/40 bg-cyan/15 text-cyan'
                    : 'border-white/20 bg-white/5 text-slate-200 hover:border-cyan/30'
                }`}
              >
                Session Trace
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === 'graph'
                    ? 'border-cyan/40 bg-cyan/15 text-cyan'
                    : 'border-white/20 bg-white/5 text-slate-200 hover:border-cyan/30'
                }`}
              >
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

              <div className="mt-3 grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    void handleCopyReport();
                  }}
                  className="w-full rounded-xl border border-cyan/50 bg-cyan/15 px-3 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/25"
                >
                  Copy report
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="w-full rounded-xl border border-amber/50 bg-amber/20 px-3 py-2 text-sm font-semibold text-amber transition hover:bg-amber/30"
                >
                  Download .txt
                </button>
              </div>

              {copyFeedback ? (
                <p
                  className={`mt-2 rounded-lg border px-2 py-1 text-xs ${
                    copyFeedback.tone === 'success'
                      ? 'border-cyan/40 bg-cyan/10 text-cyan'
                      : 'border-amber/40 bg-amber/10 text-amber'
                  }`}
                >
                  {copyFeedback.message}
                </p>
              ) : null}

              {downloadFeedback ? (
                <p className="mt-2 rounded-lg border border-cyan/40 bg-cyan/10 px-2 py-1 text-xs text-cyan">
                  {downloadFeedback.message}
                </p>
              ) : null}

              {showManualCopy ? (
                <div className="mt-2 rounded-xl border border-dashed border-amber/40 bg-amber/10 p-2">
                  <p className="text-xs text-amber">Manual copy fallback</p>
                  <textarea
                    readOnly
                    value={reportText}
                    className="mt-1 h-28 w-full rounded-lg border border-white/20 bg-[#0B1E39]/70 p-2 text-xs text-slate-100"
                  />
                </div>
              ) : null}
            </Card>
          </aside>

          <div className="grid grid-cols-1 gap-4 lg:col-span-9 xl:grid-cols-2">
            {activeTab === 'trace' ? (
              <>
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
              </>
            ) : (
              <Card
                title="Flag dependency & rollout graph"
                subtitle="Nodes represent evaluated flags. Solid edges show rollout sequence, dashed edges show inferred dependencies."
                className="xl:col-span-2"
              >
                {selectedSession ? (
                  <GraphPanel nodes={graph.nodes} edges={graph.edges} />
                ) : (
                  <div className="rounded-xl border border-dashed border-cyan/40 bg-cyan/10 p-4 text-sm text-cyan">
                    Loading graph view…
                  </div>
                )}
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
