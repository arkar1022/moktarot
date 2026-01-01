export const metadata = {
  title: 'Maintenance | MOK Tarot Reading',
  description: 'MOK Tarot is temporarily offline for scheduled maintenance.',
}

export default function MaintenancePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-mok-black text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-gold-radial blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-gold-radial blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <div className="w-full space-y-6 rounded-2xl border border-mok-gold/25 bg-gradient-to-b from-mok-smoke/80 via-mok-black to-mok-black/80 p-10 shadow-[0_0_50px_rgba(197,162,74,0.15)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-mok-gold">
            Temporary pause
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            We&apos;re currently in maintenance
          </h1>
          <p className="text-lg leading-relaxed text-gray-200">
            We&apos;re refreshing the deck and will be available again on{' '}
            <span className="font-semibold text-mok-gold">January 12</span>. Thank you for
            your patience while we finish up this update.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="h-px flex-1 bg-mok-gold/30" />
            <span className="uppercase tracking-[0.2em]">MOK Tarot</span>
            <span className="h-px flex-1 bg-mok-gold/30" />
          </div>
        </div>
      </div>
    </main>
  )
}
