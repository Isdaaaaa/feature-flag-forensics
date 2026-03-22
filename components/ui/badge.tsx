type BadgeTone = 'matched' | 'missed' | 'conflict' | 'stale' | 'neutral';

const toneClass: Record<BadgeTone, string> = {
  matched: 'border-cyan/50 bg-cyan/15 text-cyan',
  missed: 'border-slate-400/40 bg-slate-100/10 text-slate-200',
  conflict: 'border-amber/60 bg-amber/20 text-amber',
  stale: 'border-fuchsia-300/50 bg-fuchsia-300/15 text-fuchsia-200',
  neutral: 'border-white/25 bg-white/10 text-slate-100',
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}>
      {label}
    </span>
  );
}
