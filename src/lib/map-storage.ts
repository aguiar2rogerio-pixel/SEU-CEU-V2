import type {
  ApplicationManifest,
  BirthProfile,
  MapReadingId,
  MapReadings,
  NatalChart,
  NatalMapRecord,
  SavedInterpretation,
  WeeklyBundle,
} from "./types";
import { parseBirthProfile } from "./profile-validation";
import { isWeeklyBundle } from "./weekly-bundle";

export const APPLICATION_MANIFEST_KEY = "seu_ceu_application_manifest_v2";
export const MAP_KEY_PREFIX = "seu_ceu_map_v2_";
export const MAP_STORAGE_SCHEMA_VERSION = 2 as const;

const LEGACY_PROFILE_KEY = "seu_ceu_profile";
const LEGACY_BUNDLE_KEY = "seu_ceu_weekly_bundle";
const LEGACY_AI_READING_KEY = "seu_ceu_saved_ai_reading";
const LEGACY_READING_PREFIX = "seu_ceu_reading_";
const LEGACY_ACCESS_KEY = "seu_ceu_v2_test_access";
const READING_IDS: MapReadingId[] = ["natal", "current", "yearly"];

function storage(): Storage {
  if (typeof localStorage === "undefined") throw new Error("O armazenamento local não está disponível.");
  return localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyReadings(): MapReadings {
  return { natal: null, current: null, yearly: null };
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Fingerprint deliberadamente ignora o nome: renomear não afeta o mapa calculado. */
export function calculateProfileFingerprint(profile: BirthProfile): string {
  return stableHash(JSON.stringify({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    birthTimeAccuracy: profile.birthTimeAccuracy,
    birthPlace: profile.birthPlace,
    birthState: profile.birthState,
    birthCity: profile.birthCity,
    birthLatitude: profile.birthLatitude,
    birthLongitude: profile.birthLongitude,
    birthTimezone: profile.birthTimezone,
    timezoneConfirmed: profile.timezoneConfirmed,
  }));
}

export function mapStorageKey(id: string): string {
  return `${MAP_KEY_PREFIX}${id}`;
}

function createMapId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `map-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseSavedInterpretation(value: unknown, expectedType: MapReadingId): SavedInterpretation | null {
  if (!isRecord(value)) return null;
  if (typeof value.text !== "string" || !value.text.trim()) return null;
  if (value.type !== expectedType || typeof value.savedAt !== "string" || typeof value.calculationFingerprint !== "string" || typeof value.profileName !== "string") return null;
  const status = value.status === "stale" ? "stale" : value.status === "current" ? "current" : null;
  if (!status) return null;
  return {
    text: value.text,
    type: expectedType,
    savedAt: value.savedAt,
    calculationFingerprint: value.calculationFingerprint,
    profileName: value.profileName,
    status,
  };
}

function parseReadings(value: unknown): MapReadings {
  if (!isRecord(value)) return emptyReadings();
  return {
    natal: parseSavedInterpretation(value.natal, "natal"),
    current: parseSavedInterpretation(value.current, "current"),
    yearly: parseSavedInterpretation(value.yearly, "yearly"),
  };
}

export function parseApplicationManifest(value: unknown): ApplicationManifest | null {
  if (!isRecord(value) || value.schemaVersion !== 2 || (typeof value.primaryMapId !== "string" && value.primaryMapId !== null) || !Array.isArray(value.mapIds) || !value.mapIds.every((id) => typeof id === "string" && id.length > 0)) return null;
  if (new Set(value.mapIds).size !== value.mapIds.length) return null;
  if (value.primaryMapId !== null && !value.mapIds.includes(value.primaryMapId)) return null;
  if (!isRecord(value.access) || typeof value.access.testAccessGranted !== "boolean" || typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") return null;
  return value as unknown as ApplicationManifest;
}

export function parseNatalMapRecord(value: unknown): NatalMapRecord | null {
  if (!isRecord(value)) return null;
  const profile = parseBirthProfile(value.profile);
  if (!profile || typeof value.id !== "string" || !value.id || (value.natal !== null && !isRecord(value.natal)) || (value.weeklyBundle !== null && !isWeeklyBundle(value.weeklyBundle))) return null;
  if (typeof value.calculationFingerprint !== "string" || !["ready", "stale", "pending", "error"].includes(value.calculationStatus as string) || (value.natalExtensionsVersion !== null && typeof value.natalExtensionsVersion !== "string") || typeof value.createdAt !== "string" || typeof value.updatedAt !== "string" || (value.lastCalculatedAt !== null && typeof value.lastCalculatedAt !== "string")) return null;
  return {
    id: value.id,
    profile,
    natal: value.natal as NatalChart | null,
    weeklyBundle: value.weeklyBundle as WeeklyBundle | null,
    readings: parseReadings(value.readings),
    calculationFingerprint: value.calculationFingerprint,
    calculationStatus: value.calculationStatus as NatalMapRecord["calculationStatus"],
    natalExtensionsVersion: value.natalExtensionsVersion as string | null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lastCalculatedAt: value.lastCalculatedAt as string | null,
  };
}

export function loadApplicationManifest(): ApplicationManifest | null {
  try {
    const raw = storage().getItem(APPLICATION_MANIFEST_KEY);
    return raw ? parseApplicationManifest(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function saveApplicationManifest(manifest: ApplicationManifest): void {
  if (!parseApplicationManifest(manifest)) throw new Error("Manifesto de aplicação inválido.");
  storage().setItem(APPLICATION_MANIFEST_KEY, JSON.stringify(manifest));
}

export function loadNatalMapRecord(id: string): NatalMapRecord | null {
  try {
    const raw = storage().getItem(mapStorageKey(id));
    return raw ? parseNatalMapRecord(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function loadAllNatalMapRecords(manifest = loadApplicationManifest()): NatalMapRecord[] {
  if (!manifest) return [];
  return manifest.mapIds
    .map((id) => loadNatalMapRecord(id))
    .filter((record): record is NatalMapRecord => record !== null);
}

export function saveNatalMapRecord(record: NatalMapRecord): void {
  if (!parseNatalMapRecord(record)) throw new Error("Registro de mapa inválido.");
  storage().setItem(mapStorageKey(record.id), JSON.stringify(record));
}

function applicationStateFromCurrent(): { manifest: ApplicationManifest; maps: NatalMapRecord[] } {
  const manifest = loadApplicationManifest();
  if (!manifest) throw new Error("O manifesto de mapas não está disponível.");
  const maps = loadAllNatalMapRecords(manifest);
  if (maps.length !== manifest.mapIds.length) throw new Error("Um ou mais mapas salvos não puderam ser lidos.");
  return { manifest, maps };
}

/** Persiste uma alteração de registro sem criar uma segunda fonte de dados. */
export function updateMapInApplication(record: NatalMapRecord): ApplicationManifest {
  const { manifest, maps } = applicationStateFromCurrent();
  if (!manifest.mapIds.includes(record.id)) throw new Error("Este mapa não pertence à aplicação.");
  restoreApplicationState(
    { ...manifest, updatedAt: new Date().toISOString() },
    maps.map((map) => map.id === record.id ? record : map),
  );
  return loadApplicationManifest() ?? manifest;
}

/** Adiciona um mapa ao manifesto e mantém o estado legado projetado no mapa principal. */
export function addMapToApplication(record: NatalMapRecord, makePrimary = false): ApplicationManifest {
  const current = loadApplicationManifest();
  if (!current) throw new Error("O manifesto de mapas não está disponível.");
  if (current.mapIds.includes(record.id)) throw new Error("Este mapa já existe.");
  const maps = loadAllNatalMapRecords(current);
  const primaryMapId = makePrimary ? record.id : current.primaryMapId;
  const manifest: ApplicationManifest = { ...current, primaryMapId, mapIds: [...current.mapIds, record.id], updatedAt: new Date().toISOString() };
  restoreApplicationState(manifest, [...maps, record]);
  return loadApplicationManifest() ?? manifest;
}

/** Remove somente um mapa; apagar o principal deixa a aplicação temporariamente sem principal. */
export function deleteMapFromApplication(id: string): ApplicationManifest {
  const current = loadApplicationManifest();
  if (!current || !current.mapIds.includes(id)) throw new Error("Este mapa não pertence à aplicação.");
  const maps = loadAllNatalMapRecords(current).filter((map) => map.id !== id);
  const manifest: ApplicationManifest = {
    ...current,
    primaryMapId: current.primaryMapId === id ? null : current.primaryMapId,
    mapIds: current.mapIds.filter((mapId) => mapId !== id),
    updatedAt: new Date().toISOString(),
  };
  restoreApplicationState(manifest, maps);
  return loadApplicationManifest() ?? manifest;
}

export function setPrimaryMapInApplication(id: string | null): ApplicationManifest {
  const current = loadApplicationManifest();
  if (!current) throw new Error("O manifesto de mapas não está disponível.");
  if (id !== null && !current.mapIds.includes(id)) throw new Error("O mapa escolhido não pertence à aplicação.");
  const manifest = { ...current, primaryMapId: id, updatedAt: new Date().toISOString() };
  restoreApplicationState(manifest, loadAllNatalMapRecords(current));
  return loadApplicationManifest() ?? manifest;
}

/** Restaura manifesto e mapas em conjunto, revertendo chaves v2 e a projeção legada em caso de falha. */
export function restoreApplicationState(manifest: ApplicationManifest, maps: NatalMapRecord[]): void {
  const mapIds = maps.map((map) => map.id);
  const hasExactMapSet = mapIds.length === manifest.mapIds.length && new Set(mapIds).size === mapIds.length && mapIds.every((id) => manifest.mapIds.includes(id));
  if (!parseApplicationManifest(manifest) || !hasExactMapSet || maps.some((map) => !parseNatalMapRecord(map)) || (manifest.primaryMapId !== null && !mapIds.includes(manifest.primaryMapId))) {
    throw new Error("O estado da aplicação a restaurar é inválido.");
  }
  const store = storage();
  const previousManifest = loadApplicationManifest();
  const legacyReadingKeys = READING_IDS.map((id) => `${LEGACY_READING_PREFIX}${id}`);
  const allMapIds = [...new Set([...(previousManifest?.mapIds ?? []), ...manifest.mapIds])];
  const keys = [APPLICATION_MANIFEST_KEY, ...allMapIds.map(mapStorageKey), LEGACY_PROFILE_KEY, LEGACY_BUNDLE_KEY, LEGACY_AI_READING_KEY, ...legacyReadingKeys];
  const previous = new Map(keys.map((key) => [key, store.getItem(key)]));
  const primary = manifest.primaryMapId ? maps.find((map) => map.id === manifest.primaryMapId) ?? null : null;

  try {
    maps.forEach(saveNatalMapRecord);
    (previousManifest?.mapIds ?? []).filter((id) => !manifest.mapIds.includes(id)).forEach((id) => store.removeItem(mapStorageKey(id)));
    saveApplicationManifest(manifest);
    if (primary) {
      store.setItem(LEGACY_PROFILE_KEY, JSON.stringify(primary.profile));
      if (primary.weeklyBundle) store.setItem(LEGACY_BUNDLE_KEY, JSON.stringify(primary.weeklyBundle));
      else store.removeItem(LEGACY_BUNDLE_KEY);
      for (const id of READING_IDS) {
        const reading = primary.readings[id]?.text ?? null;
        const key = `${LEGACY_READING_PREFIX}${id}`;
        if (reading) store.setItem(key, reading);
        else store.removeItem(key);
      }
      if (primary.readings.natal?.text) store.setItem(LEGACY_AI_READING_KEY, primary.readings.natal.text);
      else store.removeItem(LEGACY_AI_READING_KEY);
    } else {
      [LEGACY_PROFILE_KEY, LEGACY_BUNDLE_KEY, LEGACY_AI_READING_KEY, ...legacyReadingKeys].forEach((key) => store.removeItem(key));
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const [key, value] of previous) {
      try {
        if (value === null) store.removeItem(key);
        else store.setItem(key, value);
      } catch {
        rollbackFailed = true;
      }
    }
    throw new Error(rollbackFailed ? "A restauração falhou e não foi possível reverter todos os dados." : "A restauração falhou; os dados anteriores foram mantidos.");
  }
}

/** Restaura um backup sem permitir que o arquivo conceda acesso neste aparelho. */
export function restoreImportedApplicationState(manifest: ApplicationManifest, maps: NatalMapRecord[], existingAccess: boolean): void {
  restoreApplicationState({ ...manifest, access: { testAccessGranted: existingAccess } }, maps);
}

function readLegacyReading(id: MapReadingId): string {
  const current = storage().getItem(`${LEGACY_READING_PREFIX}${id}`);
  if (current) return current;
  return id === "natal" ? storage().getItem(LEGACY_AI_READING_KEY) ?? "" : "";
}

function legacyReadings(profile: BirthProfile, fingerprint: string): MapReadings {
  const savedAt = new Date().toISOString();
  return READING_IDS.reduce((readings, id) => {
    const text = readLegacyReading(id);
    readings[id] = text.trim()
      ? { text, type: id, savedAt, calculationFingerprint: fingerprint, profileName: profile.name, status: "current" }
      : null;
    return readings;
  }, emptyReadings());
}

function legacyManifest(now: string, mapId: string, access: boolean): ApplicationManifest {
  return {
    schemaVersion: 2,
    primaryMapId: mapId,
    mapIds: [mapId],
    access: { testAccessGranted: access },
    createdAt: now,
    updatedAt: now,
  };
}

/** Migra as chaves antigas sem removê-las; repetir a chamada não duplica mapas. */
export function migrateLegacyStorage(): ApplicationManifest | null {
  try {
    const existing = loadApplicationManifest();
    if (existing) return existing;

    const store = storage();
    const rawProfile = store.getItem(LEGACY_PROFILE_KEY);
    if (!rawProfile) return null;
    const profile = parseBirthProfile(JSON.parse(rawProfile) as unknown);
    if (!profile) return null;

    const rawBundle = store.getItem(LEGACY_BUNDLE_KEY);
    const parsedBundle = rawBundle ? JSON.parse(rawBundle) as unknown : null;
    const weeklyBundle = parsedBundle && isWeeklyBundle(parsedBundle) ? parsedBundle : null;
    const now = new Date().toISOString();
    const id = createMapId();
    const fingerprint = calculateProfileFingerprint(profile);
    const record: NatalMapRecord = {
      id,
      profile,
      natal: weeklyBundle?.natal ?? null,
      weeklyBundle,
      readings: legacyReadings(profile, fingerprint),
      calculationFingerprint: fingerprint,
      calculationStatus: weeklyBundle ? "ready" : "pending",
      natalExtensionsVersion: weeklyBundle?.natal.natalExtensionsVersion ?? null,
      createdAt: now,
      updatedAt: now,
      lastCalculatedAt: weeklyBundle?.calculatedAt ?? null,
    };
    const manifest = legacyManifest(now, id, store.getItem(LEGACY_ACCESS_KEY) === "granted");

    saveNatalMapRecord(record);
    try {
      saveApplicationManifest(manifest);
      if (parseApplicationManifest(JSON.parse(store.getItem(APPLICATION_MANIFEST_KEY) ?? "null")) === null) throw new Error("Manifesto não pôde ser validado após a gravação.");
    } catch (error) {
      try { store.removeItem(mapStorageKey(id)); } catch { /* preserva o erro original */ }
      throw new Error(`A migração dos dados locais falhou: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }
    return manifest;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("A migração dos dados locais falhou:")) throw error;
    throw new Error(`A migração dos dados locais falhou: ${error instanceof Error ? error.message : "erro desconhecido"}`);
  }
}

export function createEmptyMapRecord(profile: BirthProfile, now = new Date().toISOString()): NatalMapRecord {
  const fingerprint = calculateProfileFingerprint(profile);
  return {
    id: createMapId(),
    profile,
    natal: null,
    weeklyBundle: null,
    readings: emptyReadings(),
    calculationFingerprint: fingerprint,
    calculationStatus: "pending",
    natalExtensionsVersion: null,
    createdAt: now,
    updatedAt: now,
    lastCalculatedAt: null,
  };
}

export function restoreLegacyBackupAsApplicationState(profile: BirthProfile, weeklyBundle: WeeklyBundle | null, existingAccess = storage().getItem(LEGACY_ACCESS_KEY) === "granted"): ApplicationManifest {
  const map = createEmptyMapRecord(profile);
  const now = new Date().toISOString();
  const migratedMap: NatalMapRecord = {
    ...map,
    natal: weeklyBundle?.natal ?? null,
    weeklyBundle,
    calculationStatus: weeklyBundle ? "ready" : "pending",
    natalExtensionsVersion: weeklyBundle?.natal.natalExtensionsVersion ?? null,
    lastCalculatedAt: weeklyBundle?.calculatedAt ?? null,
    updatedAt: now,
  };
  const manifest: ApplicationManifest = {
    schemaVersion: 2,
    primaryMapId: migratedMap.id,
    mapIds: [migratedMap.id],
    access: { testAccessGranted: existingAccess },
    createdAt: now,
    updatedAt: now,
  };
  restoreApplicationState(manifest, [migratedMap]);
  return manifest;
}
