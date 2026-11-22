export type PlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

export type ZodiacSign =
  | "Áries"
  | "Touro"
  | "Gêmeos"
  | "Câncer"
  | "Leão"
  | "Virgem"
  | "Libra"
  | "Escorpião"
  | "Sagitário"
  | "Capricórnio"
  | "Aquário"
  | "Peixes";

export type BirthTimeAccuracy = "exact" | "approximate" | "unknown";
export type AspectType = "conjunção" | "sextil" | "quadratura" | "trígono" | "oposição";

export interface BirthProfile {
  schemaVersion: 1;
  name: string;
  birthDate: string;
  birthTime: string | null;
  birthTimeAccuracy: BirthTimeAccuracy;
  birthPlace: string | null;
  birthState?: string;
  birthCity?: string;
  birthLatitude?: number | null;
  birthLongitude?: number | null;
  birthTimezone: string;
  timezoneConfirmed: boolean;
  updatedAt: string;
}

export interface PlanetPosition {
  planet: PlanetId | "ascendant";
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  retrograde: boolean;
}

export type ComplementaryPointId =
  | "northNode"
  | "southNode"
  | "lilith"
  | "chiron"
  | "partOfFortune"
  | "vertex";
export type NatalAngleId = "ascendant" | "descendant" | "midheaven" | "imumCoeli";

export interface NatalEclipticPoint {
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  minute: number;
}

export interface NatalAngle extends NatalEclipticPoint {
  id: NatalAngleId;
}

export interface ComplementaryPointPosition {
  id: ComplementaryPointId;
  longitude: number | null;
  sign: ZodiacSign | null;
  degree: number | null;
  /** Minuto inteiro truncado para conferência; longitude/degree preservam o valor exato. */
  minute: number | null;
  house: number | null;
  retrograde: boolean | null;
  motion: "direct" | "retrograde" | "stationary" | "not-applicable" | null;
  speedDegreesPerDay: number | null;
  status: "calculated" | "estimated" | "unavailable";
  method: string;
  reason: string | null;
}

export interface NatalHouseCusp extends NatalEclipticPoint {
  house: number;
}

export interface NatalHouseData {
  status: "calculated" | "estimated" | "unavailable";
  system: "placidus";
  angles: Record<NatalAngleId, NatalAngle> | null;
  cusps: NatalHouseCusp[];
  message: string | null;
}

export type NatalChart = Record<PlanetId, PlanetPosition | null> & {
  ascendant?: PlanetPosition | null;
  natalExtensionsVersion?: string;
  angles?: Record<NatalAngleId, NatalAngle> | null;
  houses?: NatalHouseData | null;
  complementaryPoints?: Partial<Record<ComplementaryPointId, ComplementaryPointPosition | null>>;
};

export interface TransitAspect {
  transitPlanet: PlanetId;
  natalPlanet: PlanetId;
  type: AspectType;
  orb: number;
  score: number;
  date: string;
}

export interface GlobalAspect {
  firstPlanet: PlanetId;
  secondPlanet: PlanetId;
  type: AspectType;
  orb: number;
  date: string;
}

export interface DailyEphemeris {
  date: string;
  positions: Record<PlanetId, PlanetPosition>;
  retrogrades: PlanetId[];
  globalAspects: GlobalAspect[];
}

export interface DailyReading {
  date: string;
  title: string;
  summary: string;
  action: string;
  career: string;
  relationships: string;
  aspects: TransitAspect[];
  basis: "aspecto-pessoal" | "reflexao-geral";
}

export interface WeeklyBundle {
  version: 1;
  ephemerisVersion: string;
  weekStart: string;
  profileUpdatedAt: string;
  calculatedAt: string;
  natal: NatalChart;
  days: DailyEphemeris[];
  readings: DailyReading[];
}
