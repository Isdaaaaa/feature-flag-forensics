import { ReactNode } from 'react';

type CardProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, children, className = '' }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-white/10 bg-[#0E2748]/90 p-4 shadow-card backdrop-blur ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-3">
          {title ? <h3 className="text-sm font-semibold tracking-wide text-white">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-xs text-slate-300">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}
