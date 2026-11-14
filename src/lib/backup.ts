import type { BirthProfile, WeeklyBundle } from "./types";

export type BackupData = {
  version: 1;
  exportedAt: string;
  profile: BirthProfile;
  weeklyBundle: WeeklyBundle | null;
};

// Validador simples de estrutura do perfil
function isValidProfile(profile: any): profile is BirthProfile {
  return (
    profile &&
    typeof profile === "object" &&
    typeof profile.name === "string" &&
    typeof profile.birthDate === "string"
  );
}

// Validador simples da estrutura do pacote semanal
function isValidWeeklyBundle(bundle: any): bundle is WeeklyBundle {
  return (
    bundle === null ||
    (bundle &&
      typeof bundle === "object" &&
      typeof bundle.weekStart === "string" &&
      Array.isArray(bundle.days))
  );
}

export function createBackup(
  profile: BirthProfile,
  weeklyBundle: WeeklyBundle | null
): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    weeklyBundle,
  };
}

export function downloadBackup(
  profile: BirthProfile,
  weeklyBundle: WeeklyBundle | null
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

  if (parsed.version !== 1) {
    throw new Error("Versão de backup não suportada.");
  }

  if (!isValidProfile(parsed.profile)) {
    throw new Error("O arquivo de backup não contém um perfil válido.");
  }

  const weeklyBundle = isValidWeeklyBundle(parsed.weeklyBundle)
    ? parsed.weeklyBundle
    : null;

  return {
    version: 1,
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    profile: parsed.profile,
    weeklyBundle,
  };
}
