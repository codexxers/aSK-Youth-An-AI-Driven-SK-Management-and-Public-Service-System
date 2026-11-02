/**
 * Full-screen fallback when the Node backend is unreachable (/health fails).
 * Shown only from App.jsx when tunnel + PC stack are down or misconfigured.
 */
export default function ChatbotInactivePage({ onRetry, isRetrying }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-950 text-slate-100 overflow-hidden">
      <div className="absolute inset-0 bg-noise-dark opacity-40 pointer-events-none" aria-hidden />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-lg text-center space-y-6 animate-fade-in">
        <p className="font-display text-xs tracking-[0.35em] text-cyan-400/90 uppercase">
          aSK//YOUTH.AI
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Chatbot inactive
        </h1>
        <p className="text-slate-400 text-base leading-relaxed">
          The assistant is offline right now — usually the PC that runs the AI and tunnel is asleep or disconnected.
          <span className="block mt-2 text-slate-500 text-sm">
            Come back a little later, or try again in a moment.
          </span>
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm font-semibold tracking-wide hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? 'Checking…' : 'Check again'}
        </button>
      </div>
    </div>
  )
}
