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

export type NatalChart = Record<PlanetId, PlanetPosition | null> & {
  ascendant?: PlanetPosition | null;
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
