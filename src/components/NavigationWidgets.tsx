import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Maximize2,
  Minimize2,
  Navigation,
  Waves,
} from 'lucide-react';
import type { IslandLocation } from '../utils/globeMath';
import {
  NORTH_CALM_BELT_V,
  REVERSE_MOUNTAIN_CANAL_SEGMENTS,
  SOUTH_CALM_BELT_V,
} from '../utils/sunnyNavigation';
import { getKnockUpStreamGlobeCoords } from '../utils/skypieaTerrain';
import { SUBSEA_PLUNGE_GLOBE_COORDS } from '../utils/fishManIslandTerrain';
import type { SfxSoundId, UiSoundId } from '../utils/gameAudio';
import type { SunnyTelemetry } from './OnePieceGlobe';

export interface NavigationLoadingOverlayProps {
  visible: boolean;
}

export function NavigationLoadingOverlay({
  visible,
}: NavigationLoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      data-testid="sailing-loading-overlay"
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#030712]/72"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-400/35 bg-[#070c18]/96 px-7 py-5 text-center shadow-2xl">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <svg
            viewBox="0 0 64 64"
            className="h-14 w-14 animate-spin text-amber-300"
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.28"
            />
            <circle
              cx="32"
              cy="32"
              r="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeDasharray="48 92"
              strokeLinecap="round"
            />
            <circle
              cx="32"
              cy="32"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <line
              x1="32"
              y1="4"
              x2="32"
              y2="26"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="32"
              y1="38"
              x2="32"
              y2="60"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="32"
              x2="26"
              y2="32"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="38"
              y1="32"
              x2="60"
              y2="32"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <p className="font-display text-sm font-semibold tracking-wide text-amber-200">
            Mise à l&apos;eau du Thousand Sunny...
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Chargement du navire, des courants et du Log Pose
          </p>
        </div>
      </div>
    </div>
  );
}

export interface LogPoseWidgetProps {
  telemetry: SunnyTelemetry;
  targetIsland: IslandLocation;
  routeIndex: number;
  routeTotal: number;
  arrivedNotice: string | null;
  onPrevStage: () => void;
  onNextStage: () => void;
  onPlayUiSound?: (id: SfxSoundId | UiSoundId, intensity?: number, cooldownMs?: number) => void;
}

function formatRelativeDirection(deg: number): string {
  const norm = ((deg % 360) + 540) % 360 - 180;
  if (Math.abs(norm) <= 18) return 'Cap droit devant';
  if (Math.abs(norm) >= 162) return 'Derrière la poupe';
  return norm > 0 ? `À tribord (${Math.round(norm)}°)` : `À bâbord (${Math.round(Math.abs(norm))}°)`;
}

export function LogPoseWidget({
  telemetry,
  targetIsland,
  routeIndex,
  routeTotal,
  arrivedNotice,
  onPrevStage,
  onNextStage,
  onPlayUiSound,
}: LogPoseWidgetProps) {
  const [collapsed, setCollapsed] = useState(true);
  const needleDeg = telemetry.logPoseRelativeAngleDeg;
  const northDialDeg = -telemetry.shipMapHeadingDeg;

  return (
    <section
      data-testid="sunny-log-pose"
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label="Log Pose des Mugiwara"
      className="pointer-events-auto w-[296px] rounded-xl border border-amber-400/30 bg-[#070c18]/94 p-3 shadow-2xl"
    >
      <div
        className={`flex items-center justify-between gap-2 ${
          collapsed ? '' : 'border-b border-white/10 pb-2'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Compass className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 truncate">
            Log Pose · {routeIndex + 1}/{routeTotal}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPrevStage}
            disabled={routeIndex <= 0}
            aria-label="Étape précédente du Log Pose"
            data-testid="log-pose-prev"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-white/12 bg-white/5 text-slate-200 hover:bg-white/12 disabled:opacity-35"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onNextStage}
            disabled={routeIndex >= routeTotal - 1}
            aria-label="Étape suivante du Log Pose"
            data-testid="log-pose-next"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-white/12 bg-white/5 text-slate-200 hover:bg-white/12 disabled:opacity-35"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              onPlayUiSound?.('ui-menu-click', 0.8, 70);
              setCollapsed((c) => !c);
            }}
            data-testid="log-pose-collapse-btn"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Déplier le Log Pose' : 'Replier le Log Pose'}
            title={collapsed ? 'Déplier le Log Pose' : 'Replier le Log Pose'}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-white/12 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:text-amber-200"
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-200">
          <span className="truncate font-semibold text-slate-100">
            {targetIsland.name}
          </span>
          <span className="font-mono-tabular shrink-0 text-sky-200">
            {telemetry.logPoseDistanceKm} km
          </span>
        </div>
      ) : (
        <>
          <div className="mt-2.5 flex items-center gap-3">
        {/* Glass-domed brass Log Pose compass */}
        <div className="relative h-[74px] w-[74px] shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="logPoseDome" cx="42%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                <stop offset="68%" stopColor="#0f172a" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#020617" stopOpacity="1" />
              </radialGradient>
            </defs>
            {/* Outer brass bezel */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="url(#logPoseDome)"
              stroke="#d4a24c"
              strokeWidth="3.5"
            />
            <circle
              cx="50"
              cy="50"
              r="39"
              fill="none"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1"
            />
            {/* Ship bow lubber mark at top */}
            <polygon points="50,6 45,14 55,14" fill="#f5c565" />
            {/* Rotating North reference ring */}
            <g transform={`rotate(${northDialDeg} 50 50)`}>
              <text
                x="50"
                y="22"
                textAnchor="middle"
                fill="#7dd3fc"
                fontSize="8.5"
                fontWeight="700"
              >
                N
              </text>
              <circle cx="50" cy="86" r="1.8" fill="#64748b" />
              <circle cx="14" cy="50" r="1.8" fill="#64748b" />
              <circle cx="86" cy="50" r="1.8" fill="#64748b" />
            </g>
          </svg>

          {/* Animated Log Pose needle pointing toward next Mugiwara island */}
          <div
            data-testid="log-pose-needle"
            data-angle-deg={Math.round(needleDeg)}
            className="absolute inset-0 flex items-center justify-center transition-transform duration-150"
            style={{ transform: `rotate(${needleDeg}deg)` }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
              {/* Target glowing tip pointing UP at 0deg */}
              <polygon
                points="50,15 55.5,50 44.5,50"
                fill="#fbbf24"
                stroke="#78350f"
                strokeWidth="1"
              />
              {/* Counterweight tail */}
              <polygon
                points="50,82 54,50 46,50"
                fill="#475569"
              />
              <circle cx="50" cy="50" r="5.5" fill="#f5c565" stroke="#0f172a" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Target Mugiwara island details */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Prochaine île Mugiwara
          </p>
          <p
            data-testid="log-pose-target-name"
            className="font-display truncate text-sm font-semibold text-slate-50"
          >
            {targetIsland.name}
          </p>
          <p className="truncate text-[11px] text-amber-200/90">
            {targetIsland.region} · {targetIsland.arc}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-300">
            <Navigation className="h-3 w-3 shrink-0 text-sky-300" aria-hidden="true" />
            <span className="font-mono-tabular font-semibold text-sky-200">
              {telemetry.logPoseDistanceKm} km
            </span>
            <span className="truncate text-slate-400">
              · {formatRelativeDirection(needleDeg)}
            </span>
          </div>
        </div>
      </div>

      {!collapsed && arrivedNotice && (
        <div
          data-testid="log-pose-arrived-notice"
          className="mt-2 rounded-lg border border-emerald-400/35 bg-emerald-950/65 px-2.5 py-1 text-[11px] font-medium text-emerald-200"
        >
          {arrivedNotice}
        </div>
      )}
        </>
      )}
    </section>
  );
}

export interface MiniMapWidgetProps {
  telemetry: SunnyTelemetry;
  targetIsland: IslandLocation;
  routeIslands: readonly IslandLocation[];
  routeIndex: number;
  allLocations: readonly IslandLocation[];
  onPlayUiSound?: (id: SfxSoundId | UiSoundId, intensity?: number, cooldownMs?: number) => void;
}

function wrapDeltaU(du: number): number {
  if (du > 0.5) return du - 1;
  if (du < -0.5) return du + 1;
  return du;
}

export function MiniMapWidget({
  telemetry,
  targetIsland,
  routeIslands,
  routeIndex,
  allLocations,
  onPlayUiSound,
}: MiniMapWidgetProps) {
  const [worldMode, setWorldMode] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (collapsed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Deep nautical ocean background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a2540');
    bgGrad.addColorStop(0.5, '#0c3559');
    bgGrad.addColorStop(1, '#082038');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Viewport transform: either full world [0..1] or centered sector around Sunny
    const zoom = worldMode ? 1 : 3.2;
    const centerU = worldMode ? 0.5 : telemetry.u;
    const centerV = worldMode ? 0.5 : Math.max(0.16, Math.min(0.84, telemetry.v));

    const toPxX = (u: number): number => {
      if (worldMode) return u * w;
      return (0.5 + wrapDeltaU(u - centerU) * zoom) * w;
    };
    const toPxY = (v: number): number => {
      if (worldMode) return v * h;
      return (0.5 + (v - centerV) * zoom) * h;
    };

    // Grid graticule lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 10; g++) {
      const gx = toPxX(g / 10);
      const gy = toPxY(g / 10);
      if (gx >= 0 && gx <= w) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      if (gy >= 0 && gy <= h) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
    }

    // 1. Calm Belt bands (North & South barriers)
    const drawCalmBand = (vMin: number, vMax: number) => {
      const y1 = toPxY(vMin);
      const y2 = toPxY(vMax);
      if (y2 < 0 || y1 > h) return;
      ctx.fillStyle = 'rgba(45, 212, 191, 0.24)';
      ctx.fillRect(0, y1, w, y2 - y1);

      // Diagonal hatching to clearly mark the Calm Belt barrier
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y1, w, y2 - y1);
      ctx.clip();
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.34)';
      ctx.lineWidth = 1;
      for (let x = -h; x < w + h; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x + (y2 - y1), y2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(94, 234, 212, 0.72)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y1);
      ctx.lineTo(w, y1);
      ctx.moveTo(0, y2);
      ctx.lineTo(w, y2);
      ctx.stroke();
    };

    drawCalmBand(NORTH_CALM_BELT_V.min, NORTH_CALM_BELT_V.max);
    drawCalmBand(SOUTH_CALM_BELT_V.min, SOUTH_CALM_BELT_V.max);

    // 2. Red Line belts (central meridian around 0.5 and anti-meridian around 0/1)
    const drawRedBand = (uCenter: number, halfWidth: number) => {
      const x1 = toPxX(uCenter - halfWidth);
      const x2 = toPxX(uCenter + halfWidth);
      if (x2 < x1 || x2 < 0 || x1 > w) return;
      ctx.fillStyle = '#8b2f29';
      ctx.fillRect(x1, 0, x2 - x1, h);
    };
    drawRedBand(0.5, 0.036);
    drawRedBand(0.0, 0.022);
    drawRedBand(1.0, 0.022);

    // 3. Reverse Mountain 4 canals & Paradise exit cutting cleanly through Red Line & Calm Belt
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = worldMode ? 2 : 4.5;
    ctx.lineCap = 'round';
    for (const [[au, av], [bu, bv]] of REVERSE_MOUNTAIN_CANAL_SEGMENTS) {
      ctx.beginPath();
      ctx.moveTo(toPxX(au), toPxY(av));
      ctx.lineTo(toPxX(bu), toPxY(bv));
      ctx.stroke();
    }

    // Reverse Mountain summit vortex badge
    const rmX = toPxX(0.5);
    const rmY = toPxY(0.5);
    if (rmX >= -12 && rmX <= w + 12 && rmY >= -12 && rmY <= h + 12) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(rmX, rmY, worldMode ? 2.5 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5c565';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // 3B. Knock Up Stream water elevator vortex beacon off Jaya
    const kusCoords = getKnockUpStreamGlobeCoords(10);
    const kusX = toPxX(kusCoords.u);
    const kusY = toPxY(kusCoords.v);
    if (kusX >= -12 && kusX <= w + 12 && kusY >= -12 && kusY <= h + 12) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(kusX, kusY, worldMode ? 3.2 : 5.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#e0f7ff';
      ctx.beginPath();
      ctx.arc(kusX, kusY, worldMode ? 1.5 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3C. Subsea Plunge Vortex beacon off Red Line West (Paradise -> Fish-Man Island)
    const fmiX = toPxX(SUBSEA_PLUNGE_GLOBE_COORDS.u);
    const fmiY = toPxY(SUBSEA_PLUNGE_GLOBE_COORDS.v);
    if (fmiX >= -12 && fmiX <= w + 12 && fmiY >= -12 && fmiY <= h + 12) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(fmiX, fmiY, worldMode ? 3.2 : 5.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(fmiX, fmiY, worldMode ? 1.4 : 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Mugiwara Route polyline
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(245, 197, 101, 0.55)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < routeIslands.length - 1; i++) {
      const a = routeIslands[i];
      const b = routeIslands[i + 1];
      if (Math.abs(a.u - b.u) > 0.5) continue; // skip wrap seam
      ctx.beginPath();
      ctx.moveTo(toPxX(a.u), toPxY(a.v));
      ctx.lineTo(toPxX(b.u), toPxY(b.v));
      ctx.stroke();
    }
    ctx.restore();

    // 5. Charted islands (draw dots first, then non-overlapping labels)
    const labelCandidates: { loc: IslandLocation; px: number; py: number; priority: number }[] = [];

    for (const loc of allLocations) {
      if (loc.elevationTier === 'sky') continue;
      const px = toPxX(loc.u);
      const py = toPxY(loc.v);
      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue;

      const isMajor =
        loc.notability === 'Legend' || loc.notability === 'Major Power';
      const isTarget = loc.id === targetIsland.id;
      ctx.fillStyle =
        loc.id === 'reverse-mountain'
          ? '#38bdf8'
          : isMajor
            ? '#eab308'
            : '#6ee7b7';
      ctx.beginPath();
      ctx.arc(px, py, isMajor || isTarget ? (worldMode ? 2 : 3.2) : worldMode ? 1.1 : 2.1, 0, Math.PI * 2);
      ctx.fill();

      if (!worldMode && (isMajor || isTarget)) {
        labelCandidates.push({
          loc,
          px,
          py,
          priority: isTarget ? 0 : loc.id === 'reverse-mountain' ? 1 : 2,
        });
      }
    }

    if (!worldMode && labelCandidates.length > 0) {
      labelCandidates.sort((a, b) => a.priority - b.priority);
      const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
      ctx.font = '600 8.5px system-ui, sans-serif';
      for (const item of labelCandidates) {
        const text = item.loc.name;
        const textW = ctx.measureText(text).width;
        const preferLeft = item.px + 6 + textW > w - 4;
        const tx = preferLeft ? item.px - 6 - textW : item.px + 6;
        const ty = Math.max(10, Math.min(h - 4, item.py + 3));
        const box = { x1: tx - 3, y1: ty - 9, x2: tx + textW + 3, y2: ty + 3 };

        const overlaps = placedBoxes.some(
          (b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
        );
        if (overlaps || tx < 2 || tx + textW > w - 2) continue;

        placedBoxes.push(box);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(4, 16, 34, 0.92)';
        ctx.strokeText(text, tx, ty);
        ctx.fillStyle =
          item.loc.id === targetIsland.id ? '#fde68a' : 'rgba(241, 245, 249, 0.92)';
        ctx.fillText(text, tx, ty);
      }
    }

    // Calm Belt text label inside sector view
    if (!worldMode) {
      const ncbY = toPxY((NORTH_CALM_BELT_V.min + NORTH_CALM_BELT_V.max) * 0.5);
      const scbY = toPxY((SOUTH_CALM_BELT_V.min + SOUTH_CALM_BELT_V.max) * 0.5);
      ctx.fillStyle = 'rgba(153, 246, 228, 0.9)';
      ctx.font = '700 8px system-ui, sans-serif';
      if (ncbY > 10 && ncbY < h - 6) ctx.fillText('CALM BELT', 8, ncbY + 3);
      if (scbY > 10 && scbY < h - 6) ctx.fillText('CALM BELT', 8, scbY + 3);
    }

    // 6. Target Log Pose island beacon
    const tgtX = toPxX(targetIsland.u);
    const tgtY = toPxY(targetIsland.v);
    if (tgtX >= -10 && tgtX <= w + 10 && tgtY >= -10 && tgtY <= h + 10) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(tgtX, tgtY, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Guide vector from Sunny to Target
      const sx0 = toPxX(telemetry.u);
      const sy0 = toPxY(telemetry.v);
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(tgtX, tgtY);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Thousand Sunny vessel arrow
    const sx = toPxX(telemetry.u);
    const sy = toPxY(telemetry.v);
    const rad = (telemetry.shipMapHeadingDeg * Math.PI) / 180;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rad);
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [allLocations, collapsed, routeIndex, routeIslands, targetIsland, telemetry, worldMode]);

  return (
    <section
      data-testid="sunny-minimap"
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label="Mini-carte nautique"
      className="pointer-events-auto w-[296px] rounded-xl border border-white/14 bg-[#070c18]/94 p-2.5 shadow-2xl"
    >
      <div className={`flex items-center justify-between gap-2 ${collapsed ? '' : 'mb-1.5'}`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-200 truncate">
          Carte Marine · {worldMode ? 'Monde' : 'Secteur'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {!collapsed && (
            <button
              type="button"
              onClick={() => {
                onPlayUiSound?.('ui-menu-click', 0.8, 70);
                setWorldMode((m) => !m);
              }}
              data-testid="minimap-mode-toggle"
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 whitespace-nowrap"
            >
              {worldMode ? (
                <>
                  <Minimize2 className="h-3 w-3" aria-hidden="true" />
                  <span>Secteur</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3 w-3" aria-hidden="true" />
                  <span>Monde</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onPlayUiSound?.('ui-menu-click', 0.8, 70);
              setCollapsed((c) => !c);
            }}
            data-testid="minimap-collapse-btn"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Déplier la carte marine' : 'Replier la carte marine'}
            title={collapsed ? 'Déplier la carte marine' : 'Replier la carte marine'}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-white/15 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:text-amber-200"
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <canvas
            ref={canvasRef}
            width={248}
            height={138}
            className="w-full rounded-lg border border-white/12 bg-[#041428]"
          />

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
              Sunny Go
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full border border-amber-400" />
              Log Pose
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 bg-teal-400/60" />
              Calm Belt
            </span>
          </div>
        </>
      )}

      {telemetry.calmBeltBlocked && (
        <div
          data-testid="sunny-calm-belt-warning"
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-lg border border-teal-400/50 bg-teal-950/85 px-2.5 py-1.5 text-[11px] font-medium text-teal-100"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden="true" />
          <span>
            Calm Belt infranchissable · Passez par Reverse Mountain pour entrer sur Grand Line !
          </span>
        </div>
      )}

      {telemetry.inReverseMountainCanal && !telemetry.calmBeltBlocked && (
        <div
          data-testid="sunny-reverse-mountain-badge"
          className="mt-2 flex items-center gap-2 rounded-lg border border-sky-400/45 bg-sky-950/80 px-2.5 py-1.5 text-[11px] font-medium text-sky-100"
        >
          <Waves className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden="true" />
          <span>
            {telemetry.reverseMountainPhase === 'climbing'
              ? `Ascension de Reverse Mountain · Courant ascendant (${telemetry.elevationMeters} m)`
              : telemetry.reverseMountainPhase === 'summit'
                ? 'Sommet de Reverse Mountain · Virage vers Grand Line !'
                : telemetry.reverseMountainPhase === 'descending'
                  ? 'Descente vers Grand Line · Cap sur Twin Cape !'
                  : 'Canal de Reverse Mountain · Passage vers Grand Line !'}
          </span>
        </div>
      )}

      {telemetry.skyZone === 'knock-up-stream' && (
        <div
          data-testid="sunny-knock-up-stream-badge"
          className="mt-2 flex items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-950/85 px-2.5 py-1.5 text-[11px] font-medium text-cyan-100"
        >
          <Waves className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
          <span>
            Knock Up Stream · Ascension vers Angel Beach ({Math.round(telemetry.knockUpStreamProgress * 100)}%)
          </span>
        </div>
      )}

      {telemetry.skyZone === 'skypiea' && (
        <div
          data-testid="sunny-skypiea-badge"
          className="mt-2 flex items-center gap-2 rounded-lg border border-sky-300/45 bg-sky-950/80 px-2.5 py-1.5 text-[11px] font-medium text-sky-100"
        >
          <Waves className="h-3.5 w-3.5 shrink-0 text-sky-200" aria-hidden="true" />
          <span>
            Skypiea · Mer Blanche-Blanche · Naviguez au bord pour déployer le Poulpe-Ballon
          </span>
        </div>
      )}

      {telemetry.skyZone === 'balloon-glide' && (
        <div
          data-testid="sunny-balloon-glide-badge"
          className="mt-2 flex items-center gap-2 rounded-lg border border-rose-300/50 bg-rose-950/85 px-2.5 py-1.5 text-[11px] font-medium text-rose-100"
        >
          <Waves className="h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden="true" />
          <span>
            Poulpe-Ballon déployé · Descente en planant vers la Mer Bleue ({telemetry.elevationMeters} m)
          </span>
        </div>
      )}

      {telemetry.coatingRequiredBlocked && (
        <div
          data-testid="sunny-coating-required-warning"
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-lg border border-cyan-400/50 bg-cyan-950/85 px-2.5 py-1.5 text-[11px] font-medium text-cyan-100"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
          <span>
            Revêtement de Sabaody (Groves 40–49) requis pour plonger vers l&apos;Île des Hommes-Poissons !
          </span>
        </div>
      )}

      {telemetry.coated && telemetry.skyZone === 'blue-sea' && !telemetry.coatingRequiredBlocked && (
        <div
          data-testid="sunny-coated-badge"
          className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-400/45 bg-emerald-950/80 px-2.5 py-1.5 text-[11px] font-medium text-emerald-100"
        >
          <Waves className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
          <span>
            Revêtement Yarukiman actif · Entrez dans le point de plongée à côté de Sabaody
          </span>
        </div>
      )}

      {telemetry.skyZone === 'subsea-dive' && (
        <div
          data-testid="sunny-subsea-dive-badge"
          className="mt-2 flex items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-950/85 px-2.5 py-1.5 text-[11px] font-medium text-cyan-100"
        >
          <Waves className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
          <span>
            Plongée abyssale (-10 000 m) · Descente vers l&apos;Île des Hommes-Poissons ({Math.round(telemetry.subseaDiveProgress * 100)}%)
          </span>
        </div>
      )}

      {telemetry.skyZone === 'fish-man-island' && (
        <div
          data-testid="sunny-fish-man-badge"
          className="mt-2 flex items-center gap-2 rounded-lg border border-teal-300/45 bg-teal-950/80 px-2.5 py-1.5 text-[11px] font-medium text-teal-100"
        >
          <Waves className="h-3.5 w-3.5 shrink-0 text-teal-200" aria-hidden="true" />
          <span>
            Lagon de Corail (-10 000 m) · Naviguez vers la sortie Sud pour remonter vers le Nouveau Monde
          </span>
        </div>
      )}
    </section>
  );
}
