export default function Loading() {
  return (
    <main className="min-h-screen bg-[#071226] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-20 rounded-2xl border border-cyan/20 bg-[#0B1E39]/80" />
          <div className="h-12 rounded-2xl border border-white/15 bg-[#0E2748]/80" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="h-64 rounded-2xl border border-white/15 bg-[#0E2748]/70 lg:col-span-3" />
            <div className="h-64 rounded-2xl border border-white/15 bg-[#0E2748]/70 lg:col-span-9" />
          </div>
        </div>
      </div>
    </main>
  );
}
