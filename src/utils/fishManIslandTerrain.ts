import { valueNoise2D } from './globeMath';

export const FISH_MAN_WORLD_SIZE = 340;
export const FISH_MAN_GLOBE_SCALE = 0.0022;
/**
 * Directly vertically beneath Mary Geoise (10,000 m below ocean level inside Red Line's abyssal grotto).
 */
export const FISH_MAN_GLOBE_CENTER = { u: 0.014, v: 0.515 } as const;
/**
 * World-unit depth beneath sea level (GLOBE_RADIUS = 10 -> r = 9.12),
 * symmetrically mirroring Mary Geoise's +0.88 altitude (+10,000 m).
 */
export const FISH_MAN_DEPTH = 0.88;
export const FISH_MAN_SEA_FLOOR_Y = 0.0;

/**
 * Paradise-side Subsea Plunge Vortex ("Courants marins périlleux") right beside Sabaody Archipelago,
 * where Yarukiman-coated vessels dive -10,000 m down to Fish-Man Island under Red Line.
 */
export const SUBSEA_PLUNGE_GLOBE_COORDS = { u: 0.9618, v: 0.5052 } as const;
export const SUBSEA_PLUNGE_CAPTURE_RADIUS = 0.058;
/**
 * New World resurfacing point just east of Red Line / Red Port harbor.
 */
export const FISH_MAN_NEW_WORLD_EXIT_COORDS = { u: 0.032, v: 0.515 } as const;

/** Outer protective double bubble & connected upper Ryugu Palace bubble metrics (local meters). */
export const FISH_MAN_MAIN_BUBBLE_CENTER = { x: 0, y: 30, z: 0 } as const;
export const FISH_MAN_MAIN_BUBBLE_RADIUS = 88;
export const FISH_MAN_RYUGU_BUBBLE_CENTER = { x: 0, y: 128, z: -20 } as const;
export const FISH_MAN_RYUGU_BUBBLE_RADIUS = 30;
export const FISH_MAN_SEA_FOREST_DOME_CENTER = { x: 88, y: 4, z: -46 } as const;
export const FISH_MAN_SEA_FOREST_DOME_RADIUS = 40;
export const FISH_MAN_LAGOOON_EXIT_RADIUS = 72;

/**
 * Canonical district and landmark centers in local Fish-Man Island meters
 * (North = -Z, South = +Z, East = +X, West = -X).
 */
export const FISH_MAN_LANDMARKS = {
  // South Main Entrance Water-Lock Iris Gate & Twin Arched Water Tubes
  mainEntranceGate: { x: 0.0, z: 72.0, y: 2.0 },
  coralLagoonEntry: { x: 0.0, z: 46.0, y: 0.0 },
  // Central & South Districts (Coral Hills, Mermaid Cove SW, Fish Bus Stop SE)
  coralHills: { x: 0.0, z: 12.0, y: 7.5 },
  criminShop: { x: -11.0, z: 9.0, y: 7.8 },
  coralMansions: { x: -24.0, z: 18.0, y: 6.2 },
  mermaidCove: { x: -40.0, z: 26.0, y: 0.4 },
  mermaidCafe: { x: -48.0, z: 21.0, y: 2.8 },
  fishBusStop: { x: 32.0, z: 28.0, y: 2.8 },
  // Mid/North Districts (Waterwheel Town W/NW, Meeting Hall E, Candy Factory NE, Gyoncorde Plaza N)
  waterwheelTown: { x: -44.0, z: -12.0, y: 8.0 },
  fishManMeetingHall: { x: 26.0, z: 4.0, y: 7.2 },
  candyFactory: { x: 18.0, z: -18.0, y: 8.2 },
  gyoncordePlaza: { x: -12.0, z: -38.0, y: 6.4 },
  gyoverlyHills: { x: 34.0, z: -34.0, y: 10.5 },
  // Upper Bubble: Ryugu Palace & Hard-Shell Tower
  ryuguStairBase: { x: 0.0, z: -6.0, y: 10.5 },
  ryuguPalace: { x: 0.0, z: -20.0, y: 112.0 },
  hardShellTower: { x: -15.5, z: -18.5, y: 113.0 },
  // Outer Translucent Forest Dome: Sea Forest, Poneglyph & Queen Otohime's Tomb
  seaForest: { x: 88.0, z: -46.0, y: -5.5 },
  poneglyph: { x: 92.0, z: -50.0, y: -5.2 },
  otohimeTomb: { x: 80.0, z: -41.0, y: -5.2 },
  // Deep Abyssal Outer Rim (West/SW): Fish-Man District & Colossal Ark Noah
  fishManDistrict: { x: -112.0, z: 36.0, y: -12.0 },
  arkNoah: { x: -124.0, z: -8.0, y: 26.0 },
} as const;

export interface FishManCoralBuildingSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  yaw: number;
  roofKind: 'conch' | 'dome' | 'mushroom' | 'factory';
  wallColorHex: number;
  roofColorHex: number;
  spotted: boolean;
  tierCount: 1 | 2 | 3;
}

export interface FishManCoralFormationSpec {
  x: number;
  y: number;
  z: number;
  scale: number;
  kind: 'mushroom-pillar' | 'staghorn' | 'anemone' | 'glow-coral';
  colorHex: number;
  emissive: boolean;
}

export interface FishManBubbleVillaSpec {
  x: number;
  y: number;
  z: number;
  bubbleRadius: number;
  phase: number;
  bobAmp: number;
}

export interface FishManWaterArchSpec {
  id: string;
  points: readonly [number, number, number][];
  radius: number;
}

export interface FishManShipwreckSpec {
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
  roll: number;
  pitch: number;
}

export interface FishManSeaKingSpec {
  id: string;
  kind: 'striped-whale' | 'oarfish' | 'spotted-eel';
  orbitRadius: number;
  baseY: number;
  angle: number;
  speed: number;
  scale: number;
}

export interface FishManCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isInteriorView: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Projects local Fish-Man Island coordinates (meters relative to -10,000 m seabed origin)
 * onto curved spherical tangent coordinates inside the Red Line abyssal cavern.
 */
export function toFishManSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const baseR = globeRadius - FISH_MAN_DEPTH;
  const sx = x * FISH_MAN_GLOBE_SCALE;
  const sz = z * FISH_MAN_GLOBE_SCALE;
  const rTarget = baseR + y * FISH_MAN_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) - baseR;
  return { x: sx, y: sy, z: sz };
}

/**
 * Computes distance to the interior navigable Coral Lagoon channel inside Fish-Man Island
 * (runs from South Water-Lock Entrance past Mermaid Cove & Fish Bus Stop toward North Coral Hills).
 */
export function isNavigableFishManWater(x: number, z: number): boolean {
  const rMain = Math.hypot(x, z);
  // Central South entrance bay & canal lagoon inside the bubble
  const inEntryBay = Math.abs(x) < 22 && z >= 20 && z <= 78;
  const inWestMermaidLagoon =
    Math.hypot((x + 30) / 26, (z - 34) / 20) <= 1.0 &&
    Math.hypot(x + 48, z - 21) > 10.5;
  const inEastTaxiLagoon = Math.hypot((x - 24) / 20, (z - 36) / 18) <= 1.0;
  // Water-road moat ring skirting inner Coral Hills
  const inCanalMoat =
    Math.abs(Math.hypot(x, z - 8) - 42) < 5.5 && z > -26;
  return (
    rMain < 84 &&
    (inEntryBay || inWestMermaidLagoon || inEastTaxiLagoon || inCanalMoat)
  );
}

/**
 * Continuous procedural heightfield (meters relative to lagoon sea floor = 0)
 * covering the outer abyssal seabed, the protective main bubble plateau,
 * Coral Hills terraces, Mermaid Cove beach, Gyoncorde Plaza, and Sea Forest glade.
 */
export function sampleFishManHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);

  // Abyssal seabed floor outside the main bubble & sea forest
  let seabedH =
    -15.0 +
    valueNoise2D(x * 0.03 + 7.4, z * 0.03 - 3.1) * 6.5 +
    valueNoise2D(x * 0.09 - 2.1, z * 0.09 + 5.7) * 2.4;

  // Sea Forest elevated natural glade on NE shelf
  const dSeaForest = Math.hypot(
    (x - FISH_MAN_LANDMARKS.seaForest.x) / 36,
    (z - FISH_MAN_LANDMARKS.seaForest.z) / 34
  );
  if (dSeaForest < 1.3) {
    const sfBlend = 1 - smoothstep(0.65, 1.3, dSeaForest);
    const gladeH = -5.5 + valueNoise2D(x * 0.08 + 1.1, z * 0.08 - 4.2) * 1.4;
    seabedH = seabedH * (1 - sfBlend) + gladeH * sfBlend;
  }

  // Fish-Man District rusted rock shelf (West/SW abyss)
  const dDistrict = Math.hypot(
    (x - FISH_MAN_LANDMARKS.fishManDistrict.x) / 28,
    (z - FISH_MAN_LANDMARKS.fishManDistrict.z) / 26
  );
  if (dDistrict < 1.25) {
    const distBlend = 1 - smoothstep(0.6, 1.25, dDistrict);
    seabedH = seabedH * (1 - distBlend) + -11.8 * distBlend;
  }

  if (r > 92) {
    return seabedH;
  }

  // Inside the main bubble: sculpt Coral Hills, Mermaid Cove beach, Gyoncorde Plaza & Central Lagoon
  const islandMask = 1 - smoothstep(72, 90, r);

  // Navigable water basin stays cleanly submerged (-2.6m)
  if (isNavigableFishManWater(x, z)) {
    const waterBowl = -2.4 + valueNoise2D(x * 0.12, z * 0.12) * 0.35;
    return seabedH * (1 - islandMask) + waterBowl * islandMask;
  }

  // Base coral reef terrace
  let coralH =
    5.8 +
    valueNoise2D(x * 0.06 + 3.2, z * 0.06 + 8.4) * 2.2 +
    valueNoise2D(x * 0.16, z * 0.16) * 0.65;

  // Raised tiered Coral Hills center plateau
  const dHills = Math.hypot(x / 34, (z - 8) / 22);
  if (dHills < 1.1) {
    coralH += (1 - smoothstep(0.35, 1.1, dHills)) * 2.8;
  }

  // Mermaid Cove gentle sandy beach slopes down cleanly into SW lagoon
  const dMermaidBeach = Math.hypot((x + 43) / 17, (z - 22) / 14);
  if (dMermaidBeach < 1.25) {
    const mBlend = 1 - smoothstep(0.4, 1.25, dMermaidBeach);
    coralH = coralH * (1 - mBlend) + (2.3 + valueNoise2D(x * 0.2, z * 0.2) * 0.3) * mBlend;
  }

  // Fish Bus Stop harbor plaza (SE)
  const dBus = Math.hypot((x - 33) / 14, (z - 28) / 12);
  if (dBus < 1.15) {
    const bBlend = 1 - smoothstep(0.45, 1.15, dBus);
    coralH = coralH * (1 - bBlend) + 2.8 * bBlend;
  }

  // Flat Gyoncorde Plaza amphitheater (North)
  const dGyoncorde = Math.hypot((x + 12) / 20, (z + 38) / 18);
  if (dGyoncorde < 1.2) {
    const gBlend = 1 - smoothstep(0.5, 1.2, dGyoncorde);
    coralH = coralH * (1 - gBlend) + 6.4 * gBlend;
  }

  // Gyoverly Hills terrace (NE)
  const dGyoverly = Math.hypot((x - 34) / 19, (z + 34) / 18);
  if (dGyoverly < 1.15) {
    const gyBlend = 1 - smoothstep(0.4, 1.15, dGyoverly);
    coralH = coralH * (1 - gyBlend) + 10.2 * gyBlend;
  }

  // Waterwheel Town terraces (W/NW)
  const dWaterwheel = Math.hypot((x + 44) / 18, (z + 12) / 16);
  if (dWaterwheel < 1.15) {
    const wBlend = 1 - smoothstep(0.4, 1.15, dWaterwheel);
    coralH = coralH * (1 - wBlend) + 7.8 * wBlend;
  }

  return seabedH * (1 - islandMask) + coralH * islandMask;
}

export function sampleFishManWalkSurfaceHeight(x: number, z: number): number {
  const baseH = sampleFishManHeight(x, z);
  // Coral Staircase climbing from North-Central Coral Hills up into Ryugu Palace Bubble
  if (Math.abs(x) < 11 && z <= -4 && z >= -26) {
    const climbT = clamp((-4 - z) / 20, 0, 1);
    return Math.max(baseH, 8.0 + climbT * 102.0);
  }
  return baseH;
}

/**
 * Floor clamp inside the Red Line abyssal cavern so interior presets (Coral City, Sea Forest, Ryugu Palace)
 * stay smoothly above local coral terraces or Ryugu Palace courtyard decks without ever jumping to Mary Geoise above.
 */
export function sampleFishManCameraFloorHeight(
  x: number,
  z: number,
  camHeightMeters: number
): number {
  const terrainFloor = sampleFishManHeight(x, z);
  const dRyugu = Math.hypot(
    x - FISH_MAN_LANDMARKS.ryuguPalace.x,
    z - FISH_MAN_LANDMARKS.ryuguPalace.z
  );
  if (dRyugu < 32 && camHeightMeters > 96) {
    return Math.max(terrainFloor, 110.5);
  }
  return terrainFloor;
}

/**
 * Builds deterministic Coral City townhouses, Crimin shop, Coral Mansions, Waterwheel Town cottages,
 * Candy Factory, and Gyoverly Hills manors matching `image_caf105b6.png` & `image_27e51d0d.png`.
 */
export function buildFishManBuildings(): FishManCoralBuildingSpec[] {
  const buildings: FishManCoralBuildingSpec[] = [
    // Iconic Cri★min Boutique at Coral Hills center
    {
      id: 'crimin-boutique',
      x: FISH_MAN_LANDMARKS.criminShop.x,
      z: FISH_MAN_LANDMARKS.criminShop.z,
      y: sampleFishManHeight(FISH_MAN_LANDMARKS.criminShop.x, FISH_MAN_LANDMARKS.criminShop.z),
      width: 9.2,
      depth: 8.6,
      height: 11.2,
      yaw: 0.18,
      roofKind: 'conch',
      wallColorHex: 0xf7e7be,
      roofColorHex: 0xe35d34,
      spotted: true,
      tierCount: 3,
    },
    // Candy Factory (Big Mom's striped pastel factory & candy cones)
    {
      id: 'candy-factory',
      x: FISH_MAN_LANDMARKS.candyFactory.x,
      z: FISH_MAN_LANDMARKS.candyFactory.z,
      y: sampleFishManHeight(FISH_MAN_LANDMARKS.candyFactory.x, FISH_MAN_LANDMARKS.candyFactory.z),
      width: 11.5,
      depth: 10.5,
      height: 12.6,
      yaw: -0.25,
      roofKind: 'factory',
      wallColorHex: 0xfde2e4,
      roofColorHex: 0xf472b6,
      spotted: true,
      tierCount: 3,
    },
    // Fish-Man's Meeting Hall
    {
      id: 'fish-man-meeting-hall',
      x: FISH_MAN_LANDMARKS.fishManMeetingHall.x,
      z: FISH_MAN_LANDMARKS.fishManMeetingHall.z,
      y: sampleFishManHeight(
        FISH_MAN_LANDMARKS.fishManMeetingHall.x,
        FISH_MAN_LANDMARKS.fishManMeetingHall.z
      ),
      width: 10.2,
      depth: 9.2,
      height: 8.6,
      yaw: -0.45,
      roofKind: 'dome',
      wallColorHex: 0xcffafe,
      roofColorHex: 0x14b8a6,
      spotted: false,
      tierCount: 2,
    },
  ];

  const wallPalette = [0xfef3c7, 0xd1fae5, 0xe0f2fe, 0xfce7f3, 0xede9fe];
  const roofPalette = [0xe8643a, 0xa855f7, 0x2dd4bf, 0xf59e0b, 0xec4899, 0x38bdf8];

  const clusters = [
    // Coral Hills central street flanking Crimin
    { cx: 4, cz: 10, count: 7, spread: 14, kind: 'conch' as const },
    // Coral Mansions SW above Mermaid Cove
    { cx: -25, cz: 14, count: 6, spread: 11, kind: 'mushroom' as const },
    // Waterwheel Town W/NW
    { cx: -46, cz: -12, count: 8, spread: 14, kind: 'dome' as const },
    // Gyoverly Hills NE terraced estates
    { cx: 35, cz: -32, count: 8, spread: 14, kind: 'conch' as const },
    // East Coral Promenade near Fish Bus Stop
    { cx: 36, cz: 20, count: 6, spread: 11, kind: 'mushroom' as const },
  ];

  let idx = 0;
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.count; i++) {
      idx++;
      const angle = (i / cluster.count) * Math.PI * 2 + cluster.cx * 0.13;
      const dist = 4.2 + ((i * 3.7 + idx * 1.9) % cluster.spread);
      const bx = cluster.cx + Math.cos(angle) * dist;
      const bz = cluster.cz + Math.sin(angle) * dist;
      if (isNavigableFishManWater(bx, bz)) continue;
      if (Math.hypot(bx, bz) > 68) continue;
      if (Math.hypot(bx - FISH_MAN_LANDMARKS.criminShop.x, bz - FISH_MAN_LANDMARKS.criminShop.z) < 8) continue;
      if (Math.hypot(bx + 12, bz + 38) < 15) continue; // Keep Gyoncorde Plaza open

      const by = sampleFishManHeight(bx, bz);
      const w = 3.8 + ((idx * 17) % 10) * 0.28;
      const d = 3.6 + ((idx * 13) % 10) * 0.25;
      const h = 4.6 + ((idx * 23) % 12) * 0.45;
      buildings.push({
        id: `coral-building-${idx}`,
        x: bx,
        z: bz,
        y: by,
        width: w,
        depth: d,
        height: h,
        yaw: angle + Math.PI * 0.5,
        roofKind: i % 3 === 0 ? 'conch' : cluster.kind,
        wallColorHex: wallPalette[idx % wallPalette.length],
        roofColorHex: roofPalette[(idx * 3) % roofPalette.length],
        spotted: idx % 2 === 0,
        tierCount: idx % 4 === 0 ? 3 : idx % 2 === 0 ? 2 : 1,
      });
    }
  }

  return buildings;
}

/**
 * Builds vibrant layered mushroom coral pillars, branching staghorn corals inside the city,
 * and bioluminescent corals populating the Sea Forest glade.
 */
export function buildFishManCorals(): FishManCoralFormationSpec[] {
  const corals: FishManCoralFormationSpec[] = [];
  const cityColors = [0xf43f5e, 0xfb7185, 0xa78bfa, 0x2dd4bf, 0xfbbf24, 0x38bdf8, 0xc084fc];
  const forestColors = [0x22d3ee, 0x34d399, 0x60a5fa, 0x38bdf8, 0x818cf8];

  // Layered mushroom coral towers around inner perimeter & Coral Hills (matching image_f34b838a.png & image_97089472.png)
  for (let i = 0; i < 48; i++) {
    const ang = (i / 48) * Math.PI * 2;
    const rad = 22 + ((i * 19) % 44);
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (isNavigableFishManWater(x, z)) continue;
    if (Math.hypot(x + 12, z + 38) < 16) continue;
    const y = sampleFishManHeight(x, z);
    const isPillar = i % 3 === 0;
    corals.push({
      x,
      y,
      z,
      scale: isPillar ? 1.15 + (i % 4) * 0.35 : 0.75 + (i % 5) * 0.25,
      kind: isPillar ? 'mushroom-pillar' : i % 2 === 0 ? 'staghorn' : 'anemone',
      colorHex: cityColors[i % cityColors.length],
      emissive: i % 5 === 0,
    });
  }

  // Bioluminescent Sea Forest giant corals framing the shipwreck, Poneglyph & Tomb glade
  for (let i = 0; i < 52; i++) {
    const ang = (i / 52) * Math.PI * 2 + 0.3;
    const rad = 12 + ((i * 11) % 21);
    const x = FISH_MAN_LANDMARKS.seaForest.x + Math.cos(ang) * rad;
    const z = FISH_MAN_LANDMARKS.seaForest.z + Math.sin(ang) * rad;
    // Keep SW viewing corridor clear between camera [64, -18] and Poneglyph/Tomb/Shipwrecks
    if (x < FISH_MAN_LANDMARKS.seaForest.x - 3 && z > FISH_MAN_LANDMARKS.seaForest.z - 2) {
      continue;
    }
    const y = sampleFishManHeight(x, z);
    corals.push({
      x,
      y,
      z,
      scale: 0.95 + (i % 4) * 0.34,
      kind: i % 3 === 0 ? 'mushroom-pillar' : 'glow-coral',
      colorHex: forestColors[i % forestColors.length],
      emissive: true,
    });
  }

  return corals;
}

/**
 * Floating Coral Villas encased inside translucent air bubbles drifting above Coral City (`image_97089472.png`).
 */
export function buildFishManBubbleVillas(): FishManBubbleVillaSpec[] {
  return [
    { x: -28, y: 48, z: -8, bubbleRadius: 5.2, phase: 0.4, bobAmp: 1.4 },
    { x: 24, y: 56, z: -26, bubbleRadius: 4.8, phase: 1.6, bobAmp: 1.2 },
    { x: 42, y: 44, z: 14, bubbleRadius: 4.2, phase: 2.5, bobAmp: 1.1 },
    { x: -38, y: 58, z: -30, bubbleRadius: 4.5, phase: 3.8, bobAmp: 1.3 },
    { x: 14, y: 64, z: 22, bubbleRadius: 3.9, phase: 5.0, bobAmp: 1.0 },
  ];
}

/**
 * Translucent glowing water-road arches sweeping over Coral City and out of the Main Water-Lock Gate (`image_45abb980.png`, `image_f34b838a.png`).
 */
export function buildFishManWaterArches(): FishManWaterArchSpec[] {
  return [
    // Twin iconic looping entrance water-road arches flanking the South Water-Lock Gate
    {
      id: 'gate-arch-west',
      points: [
        [-28, 3, 68],
        [-24, 24, 60],
        [-14, 34, 48],
        [-8, 12, 34],
      ],
      radius: 2.6,
    },
    {
      id: 'gate-arch-east',
      points: [
        [28, 3, 68],
        [24, 24, 60],
        [14, 34, 48],
        [8, 12, 34],
      ],
      radius: 2.6,
    },
    // Coral Hills sky-aqueduct to Waterwheel Town
    {
      id: 'arch-hills-waterwheel',
      points: [
        [-6, 9, 12],
        [-18, 28, 4],
        [-32, 30, -4],
        [-44, 10, -11],
      ],
      radius: 2.1,
    },
    // Coral Hills to Gyoverly Hills
    {
      id: 'arch-hills-gyoverly',
      points: [
        [8, 10, 8],
        [16, 26, -6],
        [26, 28, -22],
        [34, 12, -33],
      ],
      radius: 2.0,
    },
    // Waterwheel Town to Gyoncorde Plaza
    {
      id: 'arch-waterwheel-plaza',
      points: [
        [-42, 10, -14],
        [-34, 24, -24],
        [-22, 22, -32],
        [-12, 8, -36],
      ],
      radius: 1.9,
    },
    // Mermaid Cove to Fish Bus Stop coastal rainbow arch
    {
      id: 'arch-cove-busstop',
      points: [
        [-34, 3, 24],
        [-16, 26, 26],
        [12, 26, 26],
        [31, 4, 28],
      ],
      radius: 2.1,
    },
  ];
}

export function buildFishManShipwrecks(): FishManShipwreckSpec[] {
  return [
    { x: 104, z: -34, y: -5.2, scale: 1.4, yaw: 0.72, roll: 0.24, pitch: -0.14 },
    { x: 74, z: -60, y: -5.8, scale: 1.15, yaw: -1.1, roll: -0.31, pitch: 0.12 },
    { x: 112, z: -58, y: -6.1, scale: 0.95, yaw: 2.1, roll: 0.18, pitch: -0.22 },
  ];
}

export function buildFishManSeaKings(): FishManSeaKingSpec[] {
  return [
    {
      id: 'sea-king-whale',
      kind: 'striped-whale',
      orbitRadius: 138,
      baseY: 58,
      angle: 0.55,
      speed: 0.048,
      scale: 1.35,
    },
    {
      id: 'sea-king-oarfish',
      kind: 'oarfish',
      orbitRadius: 146,
      baseY: 36,
      angle: 2.4,
      speed: -0.062,
      scale: 1.25,
    },
    {
      id: 'sea-king-eel',
      kind: 'spotted-eel',
      orbitRadius: 132,
      baseY: 74,
      angle: 4.15,
      speed: 0.054,
      scale: 1.15,
    },
  ];
}

export const FISH_MAN_CAMERA_PRESETS: readonly FishManCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble · Double Bulle",
    subtitle: 'Double bulle protectrice, Palais Ryugu, racines d’Ève, Forêt Marine & Arche Noah',
    position: [44, 108, 212],
    target: [-6, 56, -16],
    isInteriorView: false,
  },
  {
    id: 'ryugu-palace',
    label: 'Palais Ryugu & Dragon d’Or',
    subtitle: 'Pagode turquoise et or, dragon doré enroulé & Tour Coquillage de Shirahoshi',
    position: [18, 121, 14],
    target: [0, 121, -20],
    isInteriorView: true,
  },
  {
    id: 'coral-city',
    label: 'Cité de Corail & Cri★min',
    subtitle: 'Boutique Cri★min à toit conque, poissons-taxis & arches aquatiques',
    position: [8, 17, 32],
    target: [-10, 13, 6],
    isInteriorView: true,
  },
  {
    id: 'mermaid-cove',
    label: 'Crique des Sirènes & Café',
    subtitle: 'Lagon turquoise, plage dorée, cascades & Mermaid Café coquillage',
    position: [-15, 13, 46],
    target: [-42, 6, 22],
    isInteriorView: true,
  },
  {
    id: 'water-lock-gate',
    label: 'Sas d’Entrée Aqueux',
    subtitle: 'Porte-sas annulaire de la double bulle & arches de routes d’eau',
    position: [20, 26, 118],
    target: [0, 14, 58],
    isInteriorView: false,
  },
  {
    id: 'sea-forest',
    label: 'Forêt Marine & Ponéglyphe',
    subtitle: 'Coraux luminescents, épaves anciennes, Ponéglyphe & tombe d’Otohime',
    position: [64, 14, -18],
    target: [88, -2, -48],
    isInteriorView: true,
  },
  {
    id: 'noah-district',
    label: 'Arche Noah & Quartier HP',
    subtitle: 'Colossal navire enchaîné & bas-fonds abyssaux du Quartier des Hommes-Poissons',
    position: [-68, 42, 62],
    target: [-122, 18, -2],
    isInteriorView: false,
  },
  {
    id: 'gyoncorde-plaza',
    label: 'Place Gyoncorde & Arbre d’Ève',
    subtitle: 'Place royale nord, Ville à Roues à Aubes, Usine de Bonbons & racines d’Ève',
    position: [-28, 24, -10],
    target: [2, 20, -40],
    isInteriorView: true,
  },
] as const;
