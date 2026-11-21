import { RotateCcw } from 'lucide-react';
import type { StartupPreloadState } from '../utils/backgroundPreloader';

export interface LoadingScreenOverlayProps {
  preloadState: StartupPreloadState;
  error: string | null;
  onRetry: () => void;
}

function LogPoseCompassSvg({
  idPrefix,
  className,
  needleClassName = 'logpose-needle-anim',
}: {
  idPrefix: string;
  className: string;
  needleClassName?: string;
}) {
  return (
    <svg viewBox="0 0 92 92" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${idPrefix}-glass`} cx="40%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#1e3a5f" stopOpacity="0.52" />
          <stop offset="100%" stopColor="#071124" stopOpacity="0.94" />
        </radialGradient>
        <linearGradient id={`${idPrefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#d4a24c" />
          <stop offset="100%" stopColor="#85581d" />
        </linearGradient>
      </defs>
      <circle
        cx="46"
        cy="46"
        r="41"
        fill="#070e1d"
        stroke={`url(#${idPrefix}-gold)`}
        strokeWidth="2.8"
      />
      <circle
        cx="46"
        cy="46"
        r="35"
        fill="none"
        stroke="#d4a24c"
        strokeOpacity="0.48"
        strokeWidth="1"
        strokeDasharray="2 4"
      />
      <circle cx="46" cy="8" r="2" fill="#f6d37a" />
      <circle cx="46" cy="84" r="2" fill="#f6d37a" />
      <circle cx="8" cy="46" r="2" fill="#f6d37a" />
      <circle cx="84" cy="46" r="2" fill="#f6d37a" />
      <circle cx="46" cy="46" r="29" fill={`url(#${idPrefix}-glass)`} />
      <line
        x1="21"
        y1="46"
        x2="71"
        y2="46"
        stroke="#93c5fd"
        strokeOpacity="0.24"
        strokeWidth="0.9"
      />
      <line
        x1="46"
        y1="21"
        x2="46"
        y2="71"
        stroke="#93c5fd"
        strokeOpacity="0.24"
        strokeWidth="0.9"
      />
      <g className={needleClassName}>
        <polygon
          points="46,18 51,46 46,52 41,46"
          fill="#f59e0b"
          stroke="#fef3c7"
          strokeWidth="0.8"
        />
        <polygon
          points="46,74 50,48 46,45 42,48"
          fill="#1e293b"
          stroke="#94a3b8"
          strokeWidth="0.7"
        />
        <circle
          cx="46"
          cy="46"
          r="4.2"
          fill="#f6d37a"
          stroke="#451a03"
          strokeWidth="1"
        />
      </g>
      <path
        d="M 27 31 A 23 23 0 0 1 56 23"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingScreenOverlay({
  preloadState,
  error,
  onRetry,
}: LoadingScreenOverlayProps) {
  const clampedProgress = Math.max(0, Math.min(1, preloadState.progress));
  const percent = Math.round(clampedProgress * 100);

  return (
    <section
      aria-label="Écran de chargement Log Pose"
      data-testid="loading-screen"
      className="pointer-events-auto fixed inset-0 z-30 flex flex-col justify-between select-none overflow-hidden px-7 py-8 sm:px-12 sm:py-10 lg:px-16 lg:py-11"
    >
      {/* Subtle left-side localized readability vignette keeping ocean & Sunny luminous */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[min(78vw,680px)]"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,10,24,0.34) 0%, rgba(4,10,24,0.16) 58%, rgba(4,10,24,0) 100%)',
        }}
      />

      {/* Upper-left Log Pose Lockup */}
      <header className="logpose-title-anim relative mt-[7vh] flex items-center gap-4 sm:mt-[9vh] sm:gap-6">
        <div className="relative shrink-0 drop-shadow-[0_10px_22px_rgba(0,0,0,0.48)]">
          <LogPoseCompassSvg
            idPrefix="loading-hero"
            className="h-20 w-20 sm:h-28 sm:w-28"
          />
        </div>

        <div className="min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-[0.26em] text-[#f4e4be] sm:text-sm"
            style={{
              textShadow: '0 2px 10px rgba(3, 8, 20, 0.72)',
            }}
          >
            Grand Line · East Blue
          </p>
          <h1
            className="font-display mt-0.5 text-4xl font-bold tracking-[0.08em] text-[#f7ebd0] sm:text-6xl lg:text-[4.25rem] lg:leading-none"
            style={{
              textShadow:
                '0 3px 18px rgba(3, 8, 20, 0.78), 0 0 32px rgba(212, 162, 76, 0.25)',
            }}
          >
            LOG POSE
          </h1>
        </div>
      </header>

      {/* Bottom Bar: Loading Progress (left) + Corner Compass (right) */}
      <div className="relative flex items-end justify-between gap-6">
        <div className="w-[min(86vw,540px)]">
          {error ? (
            <div
              role="alert"
              className="border border-[#d4a24c]/55 bg-[#071022]/92 p-4 text-slate-100 shadow-2xl"
            >
              <p className="font-display text-sm font-semibold text-amber-200">
                Impossible de charger la carte du monde
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {error}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex min-h-[40px] items-center gap-2 border border-[#d4a24c] bg-[#17284b] px-4 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-[#203663]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#f5c565]" aria-hidden="true" />
                <span>Réessayer</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Double-rimmed golden capsule progress bar */}
              <div
                role="progressbar"
                aria-label="Chargement des ressources et des îles"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                data-testid="loading-progressbar"
                className="rounded-full border border-[#d4a24c]/70 bg-[#060d1f]/65 p-[3px] shadow-[0_8px_28px_rgba(0,0,0,0.52)]"
              >
                <div className="relative h-5 w-full overflow-hidden rounded-full border border-[#d4a24c]/55 bg-[#071022]/92 sm:h-6">
                  <div
                    className="h-full w-full rounded-full transition-transform duration-200 ease-out"
                    style={{
                      transform: `scaleX(${clampedProgress})`,
                      transformOrigin: 'left center',
                      background:
                        'linear-gradient(90deg, #8e611c 0%, #c89438 45%, #f0c76b 85%, #fae39c 100%)',
                      boxShadow: 'inset 0 1px 2px rgba(255, 248, 220, 0.55)',
                    }}
                  />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between gap-4">
                <p
                  className="font-display shrink-0 text-base font-semibold tracking-[0.12em] text-[#e7cb8c] sm:text-xl"
                  style={{
                    textShadow: '0 2px 10px rgba(2, 6, 16, 0.9)',
                  }}
                >
                  {preloadState.currentLabel}
                </p>

                <p
                  className="flex min-w-0 items-baseline gap-2 text-xs text-[#e8dcc0]/90 sm:text-sm"
                  style={{
                    textShadow: '0 1px 8px rgba(2, 6, 16, 0.9)',
                  }}
                >
                  <span className="truncate">{preloadState.currentDetail}</span>
                  <span className="font-mono-tabular shrink-0 font-semibold text-[#f3d48a]">
                    {percent}%
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom-right miniature Log Pose compass */}
        <div className="hidden shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)] sm:block">
          <LogPoseCompassSvg
            idPrefix="loading-corner"
            className="h-9 w-9"
            needleClassName="logpose-loading-spin-anim"
          />
        </div>
      </div>
    </section>
  );
}
