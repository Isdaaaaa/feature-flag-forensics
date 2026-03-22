import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const timelineItems = [
  { time: '14:05:13', title: 'Session started', detail: 'US-West / iOS 17 / app v2.3.1', tone: 'neutral' as const },
  { time: '14:05:17', title: 'Rule set evaluated', detail: 'checkout_redesign gate read with 5 conditions', tone: 'matched' as const },
  { time: '14:05:19', title: 'Conflict detected', detail: 'geo whitelist matched, subscription tier missed', tone: 'conflict' as const },
];

const explanationItems = [
  { title: 'Matched attributes', body: 'country=US, app_version>=2.3.0, account_age_days=34' },
  { title: 'Missed attributes', body: 'subscription_tier expected "pro" but got "starter"' },
  { title: 'Final outcome', body: 'Flag served OFF by fallback policy and conflict precedence.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#071226] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-8">
        <header className="rounded-2xl border border-cyan/20 bg-[#0B1E39] p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Feature Flag Forensics</p>
              <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">Session-level decision trace</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-full border border-cyan/40 bg-cyan/15 px-3 py-1.5 text-sm font-medium text-cyan">Session Trace</button>
              <button className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200">Graph</button>
            </div>
          </div>
        </header>

        <section className="sticky top-3 z-10 rounded-2xl border border-white/15 bg-[#0E2748]/95 p-3 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge label="user_09812" />
            <Badge label="session_4f2e7" />
            <Badge label="checkout_redesign=OFF" tone="conflict" />
            <Badge label="payment_retry_v2=ON" tone="matched" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <Card title="Fixtures" subtitle="Dataset and metadata drawer">
              <p className="text-sm text-slate-200">Select sample incident fixtures and user/session metadata for replay.</p>
              <div className="mt-3 rounded-xl border border-dashed border-white/25 p-3 text-xs text-slate-300">Fixture drawer placeholder — slice-001 will load config + session files.</div>
            </Card>

            <Card title="Export" subtitle="Support-ready handoff" className="mt-4">
              <p className="text-sm text-slate-200">Generate a concise incident summary with timestamps, matched rules, and evidence links.</p>
              <button className="mt-3 w-full rounded-xl border border-amber/50 bg-amber/20 px-3 py-2 text-sm font-semibold text-amber">Export report (placeholder)</button>
            </Card>
          </aside>

          <div className="lg:col-span-9 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title="Timeline trace" subtitle="Ordered rule decisions and events">
              <ul className="space-y-3">
                {timelineItems.map((item) => (
                  <li key={`${item.time}-${item.title}`} className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <Badge label={item.time} tone={item.tone} />
                    </div>
                    <p className="text-sm text-slate-300">{item.detail}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl border border-cyan/30 bg-cyan/10 p-3 text-sm text-cyan">Loading state preview: evaluating additional flags…</div>
            </Card>

            <Card title="Decision explanations" subtitle="Why this outcome happened">
              <div className="space-y-3">
                {explanationItems.map((item) => (
                  <article key={item.title} className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">{item.body}</p>
                  </article>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-white/20 p-4 text-sm text-slate-300">Empty state preview: choose a fixture and session to generate explanation cards.</div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
