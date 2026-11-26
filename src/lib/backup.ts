import type { ApplicationManifest, BirthProfile, NatalMapRecord, WeeklyBundle } from "./types";
import { isWeeklyBundle } from "./weekly-bundle";
import { parseBirthProfile } from "./profile-validation";
import { parseApplicationManifest, parseNatalMapRecord } from "./map-storage";

export type BackupDataV1 = {
  version: 1;
  exportedAt: string;
  profile: BirthProfile;
  weeklyBundle: WeeklyBundle | null;
};

export type BackupDataV2 = {
  version: 2;
  exportedAt: string;
  manifest: ApplicationManifest;
  maps: NatalMapRecord[];
};

export type BackupData = BackupDataV1 | BackupDataV2;

export function createBackup(
  profile: BirthProfile,
  weeklyBundle: WeeklyBundle | null,
): BackupDataV1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    weeklyBundle,
  };
}

export function createBackupV2(
  manifest: ApplicationManifest,
  maps: NatalMapRecord[],
): BackupDataV2 {
  if (!parseApplicationManifest(manifest)) throw new Error("O manifesto do backup é inválido.");
  if (maps.length !== manifest.mapIds.length || maps.some((map) => !parseNatalMapRecord(map) || !manifest.mapIds.includes(map.id))) {
    throw new Error("Os mapas do backup não correspondem ao manifesto.");
  }
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    manifest,
    maps,
  };
}

export function downloadBackup(
  profile: BirthProfile,
  weeklyBundle: WeeklyBundle | null,
): void {
  const data = createBackup(profile, weeklyBundle);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `seu-ceu-backup-${dateStr}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadBackupV2(
  manifest: ApplicationManifest,
  maps: NatalMapRecord[],
): void {
  const data = createBackupV2(manifest, maps);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `seu-ceu-backup-v2-${dateStr}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): BackupData {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("O arquivo fornecido não é um JSON válido.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Conteúdo de backup inválido.");
  }

  if (parsed.version === 2) {
    const manifest = parseApplicationManifest(parsed.manifest);
    if (!manifest || !Array.isArray(parsed.maps) || parsed.maps.length !== manifest.mapIds.length) {
      throw new Error("O backup versão 2 não contém um manifesto ou mapas válidos.");
    }
    const parsedMaps = parsed.maps.map((map: unknown) => parseNatalMapRecord(map));
    const maps = parsedMaps.filter((map: NatalMapRecord | null): map is NatalMapRecord => map !== null);
    const mapIds = maps.map((map: NatalMapRecord) => map.id);
    if (maps.length !== parsedMaps.length || new Set(mapIds).size !== mapIds.length || mapIds.length !== manifest.mapIds.length || mapIds.some((id: string) => !manifest.mapIds.includes(id)) || (manifest.primaryMapId !== null && !mapIds.includes(manifest.primaryMapId))) {
      throw new Error("O backup versão 2 contém registros de mapas inválidos ou inconsistentes.");
    }
    return {
      version: 2,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      manifest,
      maps,
    };
  }

  if (parsed.version !== 1) {
    throw new Error("Versão de backup não suportada.");
  }

  const profile = parseBirthProfile(parsed.profile);
  if (!profile) {
    throw new Error("O arquivo de backup não contém um perfil válido.");
  }

  const weeklyBundle = parsed.weeklyBundle === null || isWeeklyBundle(parsed.weeklyBundle)
    ? parsed.weeklyBundle
    : null;

  return {
    version: 1,
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    profile,
    weeklyBundle,
  };
}
