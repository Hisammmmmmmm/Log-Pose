import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  BookOpen,
  Compass,
  Eye,
  EyeOff,
  Globe,
  Music,
  Navigation,
  RotateCcw,
  Search,
  Settings,
  Ship,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  formatCloudCover,
  formatHour,
  formatLatLon,
  type IslandLocation,
  type SeaRegion,
} from '../utils/globeMath';
import {
  JOURNAL_REGION_LABELS,
  JOURNAL_REGIONS,
  countJournalRegions,
  filterJournalIslands,
  formatSoundVolume,
  resolveLuffyStartIsland,
  type ActiveMenuModal,
  type AppScreenMode,
} from '../utils/gameMenuState';
import type { SunnyCameraMode } from '../utils/sunnyNavigation';
import type { SfxSoundId, UiSoundId } from '../utils/gameAudio';

export interface StartMenuOverlayProps {
  mode: AppScreenMode;
  activeModal: ActiveMenuModal;
  onStartAtlas: () => void;
  onStartVoyage: () => void;
  onOpenJournal: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
  onResumeFromQuit: () => void;
  onCloseModal: () => void;
  selectedIsland: IslandLocation | null;
  onObserveIslandOnAtlas: (island: IslandLocation) => void;
  onSailToIsland: (island: IslandLocation) => void;
  timeOfDay: number;
  onChangeTimeOfDay: (hour: number) => void;
  cloudCover: number;
  onChangeCloudCover: (cover: number) => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  sunnyCameraMode: SunnyCameraMode;
  onChangeSunnyCameraMode: (mode: SunnyCameraMode) => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  soundVolume: number;
  onChangeSoundVolume: (volume: number) => void;
  onPlayUiSound?: (id: SfxSoundId | UiSoundId, intensity?: number, cooldownMs?: number) => void;
  onUploadMapFile: (file: File) => void;
  onResetSettings: () => void;
}

const CAMERA_MODE_OPTIONS: readonly {
  id: SunnyCameraMode;
  label: string;
  desc: string;
}[] = [
  {
    id: 'navigator',
    label: 'Navigateur',
    desc: 'Caméra dynamique derrière le Thousand Sunny',
  },
  {
    id: 'deck',
    label: 'Pont du Sunny',
    desc: 'Vue immersive à hauteur du bastingage',
  },
  {
    id: 'overhead',
    label: 'Vue aérienne',
    desc: 'Perspective haute pour lire les récifs',
  },
];

export function StartMenuOverlay({
  mode,
  activeModal,
  onStartAtlas,
  onStartVoyage,
  onOpenJournal,
  onOpenSettings,
  onQuit,
  onResumeFromQuit,
  onCloseModal,
  selectedIsland,
  onObserveIslandOnAtlas,
  onSailToIsland,
  timeOfDay,
  onChangeTimeOfDay,
  cloudCover,
  onChangeCloudCover,
  showLabels,
  onToggleLabels,
  sunnyCameraMode,
  onChangeSunnyCameraMode,
  musicEnabled,
  onToggleMusic,
  soundVolume,
  onChangeSoundVolume,
  onPlayUiSound,
  onUploadMapFile,
  onResetSettings,
}: StartMenuOverlayProps) {
  const [journalQuery, setJournalQuery] = useState('');
  const [journalRegion, setJournalRegion] = useState<SeaRegion | 'All'>('All');
  const [journalPreviewId, setJournalPreviewId] = useState<string>(
    () =>
      selectedIsland?.id ??
      resolveLuffyStartIsland(ONE_PIECE_LOCATIONS)?.id ??
      ONE_PIECE_LOCATIONS[0]?.id ??
      ''
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const journalItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const regionCounts = useMemo(
    () => countJournalRegions(ONE_PIECE_LOCATIONS),
    []
  );

  const filteredJournalIslands = useMemo(
    () => filterJournalIslands(ONE_PIECE_LOCATIONS, journalQuery, journalRegion),
    [journalQuery, journalRegion]
  );

  const activeJournalIsland = useMemo(() => {
    return (
      filteredJournalIslands.find((loc) => loc.id === journalPreviewId) ??
      ONE_PIECE_LOCATIONS.find((loc) => loc.id === journalPreviewId) ??
      filteredJournalIslands[0] ??
      ONE_PIECE_LOCATIONS[0] ??
      null
    );
  }, [filteredJournalIslands, journalPreviewId]);

  useEffect(() => {
    if (selectedIsland) {
      setJournalPreviewId(selectedIsland.id);
    }
  }, [selectedIsland]);

  useEffect(() => {
    if (activeModal === 'journal' && journalPreviewId) {
      const targetBtn = journalItemRefs.current[journalPreviewId];
      targetBtn?.scrollIntoView({ block: 'center' });
    }
  }, [activeModal, journalPreviewId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        e.preventDefault();
        onCloseModal();
        return;
      }
      if (
        mode === 'title' &&
        !activeModal &&
        (e.key === 'Enter' || e.key === ' ') &&
        document.activeElement === document.body
      ) {
        e.preventDefault();
        onStartVoyage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, mode, onCloseModal, onStartVoyage]);

  const menuEntries = [
    {
      id: 'atlas',
      testId: 'menu-atlas-btn',
      label: 'Atlas',
      hint: 'Mode vue globe interactive et zoom sur les îles',
      icon: Globe,
      onClick: onStartAtlas,
      primary: false,
      isStart: false,
      delayMs: 520,
    },
    {
      id: 'voyage',
      testId: 'menu-voyage-btn',
      label: 'Voyage',
      hint: "Exploration libre en bateau · Départ à l'île de Luffy",
      icon: Ship,
      onClick: onStartVoyage,
      primary: true,
      isStart: true,
      delayMs: 630,
    },
    {
      id: 'journal',
      testId: 'menu-journal-btn',
      label: 'Journal de bord',
      hint: 'Encyclopédie des îles et récits maritimes',
      icon: BookOpen,
      onClick: onOpenJournal,
      primary: false,
      isStart: false,
      delayMs: 740,
    },
    {
      id: 'settings',
      testId: 'menu-settings-btn',
      label: 'Paramètres',
      hint: 'Soleil, nuages, caméra du navire & carte',
      icon: Settings,
      onClick: onOpenSettings,
      primary: false,
      isStart: false,
      delayMs: 850,
    },
    {
      id: 'quit',
      testId: 'menu-quit-btn',
      label: 'Quitter',
      hint: 'Amarrer le Thousand Sunny à Foosha',
      icon: Anchor,
      onClick: onQuit,
      primary: false,
      isStart: false,
      delayMs: 960,
    },
  ] as const;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none overflow-hidden">
      {/* Subtle left-side maritime gradient scrim + nautical meridian geometry when showing title screen */}
      {mode === 'title' && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-[min(78vw,640px)]"
            style={{
              background:
                'linear-gradient(90deg, rgba(4,9,22,0.9) 0%, rgba(4,9,22,0.68) 54%, rgba(4,9,22,0.22) 82%, rgba(4,9,22,0) 100%)',
            }}
          />

          {/* Discrete pirate cartography meridian arcs & compass rose lines */}
          <svg
            aria-hidden="true"
            viewBox="0 0 640 900"
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-[min(74vw,620px)] opacity-25"
            preserveAspectRatio="xMinYMid slice"
          >
            <g fill="none" stroke="#d4a24c" strokeWidth="0.85">
              <circle cx="96" cy="240" r="210" strokeDasharray="3 7" strokeOpacity="0.48" />
              <circle cx="96" cy="240" r="320" strokeOpacity="0.24" />
              <circle cx="96" cy="240" r="460" strokeDasharray="2 9" strokeOpacity="0.24" />
              <path d="M 36 0 Q 175 450 42 900" strokeOpacity="0.28" />
              <path d="M 140 0 Q 290 450 155 900" strokeOpacity="0.18" />
              <line x1="0" y1="240" x2="520" y2="240" strokeDasharray="4 8" strokeOpacity="0.22" />
              <line x1="96" y1="0" x2="96" y2="900" strokeDasharray="2 6" strokeOpacity="0.18" />
            </g>
          </svg>
        </>
      )}

      {/* Main Left-Aligned Title Lockup & Menu */}
      {mode === 'title' && !activeModal && (
        <section
          aria-label="Écran de démarrage Log Pose"
          className="relative flex h-full w-full flex-col justify-between px-7 py-8 sm:px-12 sm:py-10 lg:px-16 lg:py-12"
        >
          <div className="my-auto flex max-w-[395px] flex-col">
            {/* Title Lockup with integrated Log Pose SVG Emblem */}
            <header className="logpose-title-anim pointer-events-auto">
              <div className="flex items-center gap-4 sm:gap-5">
                {/* Custom SVG Log Pose Wrist-Compass */}
                <div className="relative shrink-0">
                  <svg
                    viewBox="0 0 92 92"
                    className="h-16 w-16 sm:h-20 sm:w-20"
                    aria-hidden="true"
                  >
                    <defs>
                      <radialGradient id="logpose-glass" cx="40%" cy="32%" r="65%">
                        <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.42" />
                        <stop offset="55%" stopColor="#1e3a5f" stopOpacity="0.48" />
                        <stop offset="100%" stopColor="#071124" stopOpacity="0.92" />
                      </radialGradient>
                      <linearGradient id="logpose-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fde68a" />
                        <stop offset="50%" stopColor="#d4a24c" />
                        <stop offset="100%" stopColor="#85581d" />
                      </linearGradient>
                    </defs>
                    {/* Outer brass bezel */}
                    <circle
                      cx="46"
                      cy="46"
                      r="41"
                      fill="#070e1d"
                      stroke="url(#logpose-gold)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="46"
                      cy="46"
                      r="35"
                      fill="none"
                      stroke="#d4a24c"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                    />
                    {/* Cardinal brass studs */}
                    <circle cx="46" cy="8" r="2" fill="#f6d37a" />
                    <circle cx="46" cy="84" r="2" fill="#f6d37a" />
                    <circle cx="8" cy="46" r="2" fill="#f6d37a" />
                    <circle cx="84" cy="46" r="2" fill="#f6d37a" />
                    {/* Glass dome interior */}
                    <circle cx="46" cy="46" r="29" fill="url(#logpose-glass)" />
                    {/* Subtle crosshairs inside dome */}
                    <line x1="21" y1="46" x2="71" y2="46" stroke="#93c5fd" strokeOpacity="0.22" strokeWidth="0.9" />
                    <line x1="46" y1="21" x2="46" y2="71" stroke="#93c5fd" strokeOpacity="0.22" strokeWidth="0.9" />
                    {/* Animated Log Pose needle */}
                    <g className="logpose-needle-anim">
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
                      <circle cx="46" cy="46" r="4.2" fill="#f6d37a" stroke="#451a03" strokeWidth="1" />
                    </g>
                    {/* Glass specular arc */}
                    <path
                      d="M 27 31 A 23 23 0 0 1 56 23"
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity="0.45"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4a24c]">
                    Grand Line · East Blue
                  </p>
                  <h1
                    className="font-display mt-0.5 text-4xl font-bold tracking-[0.09em] text-[#f6ead2] sm:text-5xl"
                    style={{
                      textShadow:
                        '0 2px 14px rgba(0,0,0,0.85), 0 0 28px rgba(212,162,76,0.22)',
                    }}
                  >
                    LOG POSE
                  </h1>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="logpose-rule-anim mt-4 h-[1px] w-full bg-[#d4a24c]/55"
              />
              <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
                Cartographiez les mers légendaires et larguez les amarres à bord
                du Thousand Sunny face à l&apos;île de Dawn.
              </p>
            </header>

            {/* Primary Minimalist Menu */}
            <nav
              aria-label="Menu principal"
              className="pointer-events-auto mt-7 flex flex-col gap-2.5"
            >
              {menuEntries.map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    data-testid={entry.testId}
                    data-start={entry.isStart ? 'true' : undefined}
                    onClick={entry.onClick}
                    style={
                      {
                        '--menu-delay': `${entry.delayMs}ms`,
                      } as React.CSSProperties
                    }
                    className={`logpose-menu-item-anim group relative flex min-h-[52px] w-full items-center justify-between gap-3 border px-4 py-2.5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c565] ${
                      entry.primary
                        ? 'border-[#d4a24c]/85 bg-[#12203b]/95 text-[#fef3c7] shadow-lg hover:border-[#f5c565] hover:bg-[#1a2e54]'
                        : 'border-white/14 bg-[#070f21]/88 text-slate-100 hover:border-[#d4a24c]/65 hover:bg-[#0d1933]/95'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-[3px] transition-colors ${
                        entry.primary
                          ? 'bg-[#f5c565]'
                          : 'bg-[#d4a24c]/35 group-hover:bg-[#d4a24c]'
                      }`}
                    />
                    <span className="flex min-w-0 items-center gap-3.5 pl-1">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          entry.primary
                            ? 'text-[#f5c565]'
                            : 'text-[#d4a24c]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="font-display block whitespace-nowrap text-base font-semibold tracking-wide">
                          {entry.label}
                        </span>
                        <span className="block truncate text-xs text-slate-300/80">
                          {entry.hint}
                        </span>
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-mono text-xs tracking-widest text-[#d4a24c] opacity-70 transition-transform duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                    >
                      →
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Clean single-line bottom navigation hint */}
          <p className="pointer-events-none text-xs tracking-wide text-slate-300/80">
            Entrée : Voyage depuis Foosha · Atlas : Globe interactif · Échap : Fermer
          </p>
        </section>
      )}

      {/* Journal de bord (Encyclopedia Modal) */}
      {activeModal === 'journal' && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#030712]/78 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-modal-title"
            data-testid="journal-modal"
            className="flex max-h-[86vh] w-[min(94vw,980px)] flex-col overflow-hidden border border-[#d4a24c]/40 bg-[#070d1b] text-slate-100 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/12 px-6 py-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 shrink-0 text-[#d4a24c]" aria-hidden="true" />
                <div>
                  <h2
                    id="journal-modal-title"
                    className="font-display text-lg font-semibold tracking-wide text-[#f6ead2]"
                  >
                    Journal de bord · Encyclopédie des îles
                  </h2>
                  <p className="text-xs text-slate-400">
                    {ONE_PIECE_LOCATIONS.length} îles et escales répertoriées sur les cartes de Nami
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                aria-label="Fermer le journal de bord"
                data-testid="journal-close-btn"
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 bg-[#0d1629] text-slate-200 hover:border-[#d4a24c]/60 hover:text-amber-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Search & Region Filter Bar */}
            <div className="flex flex-col gap-3 border-b border-white/10 bg-[#050a16] px-6 py-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={journalQuery}
                  onChange={(e) => setJournalQuery(e.target.value)}
                  placeholder="Rechercher une île, un arc ou une mer (ex : Foosha, Alabasta, Skypiea)..."
                  aria-label="Rechercher une île dans le journal de bord"
                  data-testid="journal-search-input"
                  className="w-full border border-white/15 bg-[#0a1224] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#d4a24c] focus:outline-none"
                />
              </div>

              <div
                role="tablist"
                aria-label="Filtrer par mer"
                className="flex flex-wrap gap-1.5"
              >
                {JOURNAL_REGIONS.map((region) => {
                  const selected = journalRegion === region;
                  return (
                    <button
                      key={region}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => {
                        onPlayUiSound?.('ui-menu-click', 0.8, 70);
                        setJournalRegion(region);
                      }}
                      className={`whitespace-nowrap shrink-0 border px-2.5 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-[#d4a24c] bg-[#1a2744] text-amber-200'
                          : 'border-white/12 bg-[#0a1224] text-slate-300 hover:border-[#d4a24c]/45 hover:text-slate-100'
                      }`}
                    >
                      {JOURNAL_REGION_LABELS[region]}{' '}
                      <span className="font-mono-tabular text-[11px] opacity-75">
                        ({regionCounts[region] ?? 0})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body: Split List & Island Lore Detail */}
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[340px_1fr]">
              {/* List */}
              <div className="atlas-scroll overflow-y-auto border-b border-white/10 p-3 md:border-b-0 md:border-r">
                {filteredJournalIslands.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-400">
                    Aucune île ne correspond à cette recherche.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {filteredJournalIslands.map((island) => {
                      const active = activeJournalIsland?.id === island.id;
                      return (
                        <li key={island.id}>
                          <button
                            ref={(el) => {
                              journalItemRefs.current[island.id] = el;
                            }}
                            type="button"
                            onClick={() => {
                              onPlayUiSound?.('ui-menu-click', 0.85, 70);
                              setJournalPreviewId(island.id);
                            }}
                            className={`flex w-full items-center justify-between gap-2 border px-3 py-2 text-left transition-colors ${
                              active
                                ? 'border-[#d4a24c] bg-[#14203b] text-amber-100'
                                : 'border-white/10 bg-[#0a1224]/80 text-slate-200 hover:border-white/25 hover:bg-[#0f1930]'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">
                                {island.name}
                              </span>
                              <span className="block truncate text-[11px] text-slate-400">
                                {island.region} · {island.arc}
                              </span>
                            </span>
                            <span
                              className="h-2.5 w-2.5 shrink-0"
                              style={{
                                backgroundColor:
                                  island.notability === 'Legend'
                                    ? '#f59e0b'
                                    : island.notability === 'Major Power'
                                      ? '#38bdf8'
                                      : island.notability === 'Grand Line'
                                        ? '#d4a24c'
                                        : '#60a5fa',
                              }}
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Detail Pane */}
              <div className="atlas-scroll flex flex-col justify-between overflow-y-auto p-6">
                {activeJournalIsland ? (
                  <>
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#d4a24c]">
                        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {activeJournalIsland.region} · {activeJournalIsland.arc}
                        </span>
                      </div>
                      <h3 className="font-display mt-2 text-2xl font-bold text-[#f6ead2]">
                        {activeJournalIsland.name}
                      </h3>
                      <p className="mt-0.5 text-sm font-medium text-amber-200/85">
                        {activeJournalIsland.subtitle}
                      </p>

                      <div className="mt-4 inline-flex items-center gap-3 border border-white/12 bg-[#0b1326] px-3 py-1.5 font-mono-tabular text-xs text-slate-300">
                        <span>
                          Coordonnées :{' '}
                          {formatLatLon(
                            activeJournalIsland.u,
                            activeJournalIsland.v
                          )}
                        </span>
                      </div>

                      <p className="mt-5 text-sm leading-relaxed text-slate-200">
                        {activeJournalIsland.description}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                      <button
                        type="button"
                        data-testid="journal-observe-btn"
                        onClick={() => onObserveIslandOnAtlas(activeJournalIsland)}
                        className="flex min-h-[42px] items-center gap-2 whitespace-nowrap shrink-0 border border-white/20 bg-[#0e1830] px-4 py-2 text-sm font-semibold text-slate-100 hover:border-[#d4a24c]/70 hover:bg-[#142244]"
                      >
                        <Globe className="h-4 w-4 text-[#d4a24c]" aria-hidden="true" />
                        <span>Observer sur l&apos;Atlas</span>
                      </button>
                      <button
                        type="button"
                        data-testid="journal-sail-btn"
                        onClick={() => onSailToIsland(activeJournalIsland)}
                        className="flex min-h-[42px] items-center gap-2 whitespace-nowrap shrink-0 border border-[#d4a24c] bg-[#1a2b4f] px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-[#233966]"
                      >
                        <Navigation className="h-4 w-4 text-[#f5c565]" aria-hidden="true" />
                        <span>Naviguer vers cette île</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">
                    Sélectionnez une île dans le journal pour consulter sa fiche.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paramètres Modal */}
      {activeModal === 'settings' && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#030712]/78 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            data-testid="settings-modal"
            className="flex max-h-[86vh] w-[min(92vw,560px)] flex-col overflow-hidden border border-[#d4a24c]/40 bg-[#070d1b] text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/12 px-6 py-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 shrink-0 text-[#d4a24c]" aria-hidden="true" />
                <div>
                  <h2
                    id="settings-modal-title"
                    className="font-display text-lg font-semibold tracking-wide text-[#f6ead2]"
                  >
                    Paramètres
                  </h2>
                  <p className="text-xs text-slate-400">
                    Atmosphère maritime, caméra du navire et carte du monde
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                aria-label="Fermer les paramètres"
                data-testid="settings-close-btn"
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 bg-[#0d1629] text-slate-200 hover:border-[#d4a24c]/60 hover:text-amber-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="atlas-scroll flex flex-col gap-5 overflow-y-auto px-6 py-5">
              {/* Audio: Music Toggle & Sound Volume */}
              <div className="flex flex-col gap-4 border border-[#d4a24c]/25 bg-[#0a1224] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      Musique du jeu
                    </p>
                    <p className="text-xs text-slate-400">
                      Activer ou couper les thèmes musicaux (mer, îles et tempêtes)
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="settings-music-toggle"
                    aria-pressed={musicEnabled}
                    onClick={onToggleMusic}
                    className={`flex min-h-[36px] items-center gap-2 whitespace-nowrap shrink-0 border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      musicEnabled
                        ? 'border-[#d4a24c] bg-[#1a2b4f] text-amber-100 hover:bg-[#233966]'
                        : 'border-white/20 bg-[#101c38] text-slate-300 hover:border-white/35'
                    }`}
                  >
                    {musicEnabled ? (
                      <>
                        <Music className="h-3.5 w-3.5 text-[#f5c565]" aria-hidden="true" />
                        <span>Activée</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span>Coupée</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="settings-volume-range"
                      className="flex items-center gap-2 text-sm font-medium text-slate-200"
                    >
                      {soundVolume <= 0.01 ? (
                        <VolumeX className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      ) : soundVolume < 0.5 ? (
                        <Volume1 className="h-4 w-4 text-[#d4a24c]" aria-hidden="true" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-[#d4a24c]" aria-hidden="true" />
                      )}
                      <span>Volume sonore</span>
                    </label>
                    <span
                      data-testid="settings-volume-readout"
                      className="font-mono-tabular text-xs font-semibold text-amber-200"
                    >
                      {formatSoundVolume(soundVolume)}
                    </span>
                  </div>
                  <input
                    id="settings-volume-range"
                    data-testid="settings-volume-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={soundVolume}
                    onChange={(e) => onChangeSoundVolume(Number(e.target.value))}
                    className="atlas-slider w-full"
                  />
                </div>
              </div>

              {/* Time of Day */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="settings-time-range"
                    className="text-sm font-medium text-slate-200"
                  >
                    Heure du monde (Soleil)
                  </label>
                  <span className="font-mono-tabular text-xs font-semibold text-amber-200">
                    {formatHour(timeOfDay)}
                  </span>
                </div>
                <input
                  id="settings-time-range"
                  type="range"
                  min={0}
                  max={24}
                  step={0.05}
                  value={timeOfDay}
                  onChange={(e) => onChangeTimeOfDay(Number(e.target.value))}
                  className="atlas-slider w-full"
                />
              </div>

              {/* Cloud Cover */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="settings-cloud-range"
                    className="text-sm font-medium text-slate-200"
                  >
                    Couverture nuageuse
                  </label>
                  <span className="font-mono-tabular text-xs font-semibold text-amber-200">
                    {formatCloudCover(cloudCover)}
                  </span>
                </div>
                <input
                  id="settings-cloud-range"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={cloudCover}
                  onChange={(e) => onChangeCloudCover(Number(e.target.value))}
                  className="atlas-slider w-full"
                />
              </div>

              {/* Island Labels */}
              <div className="flex items-center justify-between border border-white/10 bg-[#0a1224] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Noms des îles sur l&apos;Atlas
                  </p>
                  <p className="text-xs text-slate-400">
                    Afficher les balises flottantes en mode globe
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleLabels}
                  className="flex min-h-[36px] items-center gap-2 whitespace-nowrap shrink-0 border border-white/20 bg-[#101c38] px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-[#d4a24c]/70"
                >
                  {showLabels ? (
                    <>
                      <Eye className="h-3.5 w-3.5 text-[#d4a24c]" aria-hidden="true" />
                      <span>Affichés</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>Masqués</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sunny Camera Mode */}
              <div>
                <p className="mb-2 text-sm font-medium text-slate-200">
                  Caméra en mode Voyage
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {CAMERA_MODE_OPTIONS.map((opt) => {
                    const active = sunnyCameraMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeSunnyCameraMode(opt.id)}
                        className={`border px-3 py-2 text-left transition-colors ${
                          active
                            ? 'border-[#d4a24c] bg-[#172544] text-amber-100'
                            : 'border-white/12 bg-[#0a1224] text-slate-300 hover:border-white/30'
                        }`}
                      >
                        <span className="block text-xs font-semibold">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Map Upload */}
              <div className="flex items-center justify-between gap-3 border border-white/10 bg-[#0a1224] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Carte du monde personnalisée
                  </p>
                  <p className="text-xs text-slate-400">
                    Charger une projection équirectangulaire locale
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUploadMapFile(file);
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPlayUiSound?.('ui-menu-click', 0.85, 80);
                    fileInputRef.current?.click();
                  }}
                  className="flex min-h-[36px] items-center gap-2 whitespace-nowrap shrink-0 border border-white/20 bg-[#101c38] px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-[#d4a24c]/70"
                >
                  <Upload className="h-3.5 w-3.5 text-[#d4a24c]" aria-hidden="true" />
                  <span>Importer</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/12 bg-[#050a16] px-6 py-3.5">
              <button
                type="button"
                onClick={onResetSettings}
                className="flex min-h-[38px] items-center gap-2 whitespace-nowrap shrink-0 border border-white/15 bg-[#0c1528] px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#d4a24c]/60"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#d4a24c]" aria-hidden="true" />
                <span>Réinitialiser par défaut</span>
              </button>
              <button
                type="button"
                onClick={onCloseModal}
                className="min-h-[38px] whitespace-nowrap shrink-0 border border-[#d4a24c] bg-[#1a2b4f] px-5 py-1.5 text-xs font-semibold text-amber-100 hover:bg-[#233966]"
              >
                Appliquer &amp; Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quit / Docked Screen */}
      {mode === 'quit' && !activeModal && (
        <div
          data-testid="quit-screen"
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#030712]/72 p-6"
        >
          <div className="w-[min(92vw,440px)] border border-[#d4a24c]/45 bg-[#070d1b] p-7 text-center shadow-2xl">
            <Anchor
              className="mx-auto h-8 w-8 text-[#d4a24c]"
              aria-hidden="true"
            />
            <h2 className="font-display mt-3 text-2xl font-bold tracking-wide text-[#f6ead2]">
              Navire amarré à Foosha
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Le Thousand Sunny est à l&apos;ancre devant la baie de l&apos;île
              de Dawn. Revenez quand vous serez prêt à lever l&apos;ancre.
            </p>
            <button
              type="button"
              data-testid="resume-from-quit-btn"
              onClick={onResumeFromQuit}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap border border-[#d4a24c] bg-[#1a2b4f] px-6 py-2.5 font-display text-sm font-semibold tracking-wide text-amber-100 hover:bg-[#233966]"
            >
              <Compass className="h-4 w-4 text-[#f5c565]" aria-hidden="true" />
              <span>Reprendre l&apos;aventure</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
