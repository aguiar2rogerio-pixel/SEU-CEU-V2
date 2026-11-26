import type { BirthProfile, WeeklyBundle } from "./types";
import { parseBirthProfile } from "./profile-validation";
import { isWeeklyBundle } from "./weekly-bundle";
import { APPLICATION_MANIFEST_KEY, MAP_KEY_PREFIX, loadApplicationManifest, migrateLegacyStorage } from "./map-storage";

const PROFILE_KEY = "seu_ceu_profile";
const BUNDLE_KEY = "seu_ceu_weekly_bundle";
const AI_READING_KEY = "seu_ceu_saved_ai_reading";
const EXPERIENCE_READING_PREFIX = "seu_ceu_reading_";
const TEST_ACCESS_KEY = "seu_ceu_v2_test_access";

// Liberação apenas para o período de teste, salva neste aparelho.
// Não substitui uma confirmação de compra; uma futura integração deverá usar uma autorização verificada.
export function loadTestAccess(): boolean {
  try {
    return localStorage.getItem(TEST_ACCESS_KEY) === "granted";
  } catch {
    return false;
  }
}

export function saveTestAccess(): boolean {
  try {
    localStorage.setItem(TEST_ACCESS_KEY, "granted");
    return true;
  } catch {
    return false;
  }
}

export function clearTestAccess(): void {
  try {
    localStorage.removeItem(TEST_ACCESS_KEY);
  } catch (error) {
    console.error("Erro ao remover o acesso de teste:", error);
  }
}

// ------------------------------
// PERFIL DO UTILIZADOR
// ------------------------------
export function loadProfile(): BirthProfile | null {
  try {
    migrateLegacyStorage();
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return parseBirthProfile(JSON.parse(raw) as unknown);
  } catch (error) {
    console.error("Erro ao carregar perfil do localStorage:", error);
    return null;
  }
}

export function saveProfile(profile: BirthProfile): void {
  if (!parseBirthProfile(profile)) {
    throw new Error("Os dados do perfil estão incompletos ou inválidos.");
  }
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Erro ao salvar perfil no localStorage:", error);
    throw new Error("Não foi possível salvar os dados no navegador.");
  }
}

/** Persiste perfil e pacote semanal compatível em conjunto, revertendo em caso de falha. */
export function restoreProfileAndBundle(profile: BirthProfile, bundle: WeeklyBundle | null): void {
  let previousProfile: string | null;
  let previousBundle: string | null;
  try {
    previousProfile = localStorage.getItem(PROFILE_KEY);
    previousBundle = localStorage.getItem(BUNDLE_KEY);
  } catch (error) {
    console.error("Erro ao ler dados anteriores antes da restauração:", error);
    throw new Error("Não foi possível acessar os dados anteriores para restaurar o backup.");
  }

  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (bundle) localStorage.setItem(BUNDLE_KEY, JSON.stringify(bundle));
    else localStorage.removeItem(BUNDLE_KEY);
  } catch (error) {
    let rollbackFailed = false;
    try {
      if (previousProfile === null) localStorage.removeItem(PROFILE_KEY);
      else localStorage.setItem(PROFILE_KEY, previousProfile);
    } catch {
      rollbackFailed = true;
    }
    try {
      if (previousBundle === null) localStorage.removeItem(BUNDLE_KEY);
      else localStorage.setItem(BUNDLE_KEY, previousBundle);
    } catch {
      rollbackFailed = true;
    }

    console.error("Erro ao restaurar backup:", error);
    throw new Error(rollbackFailed
      ? "A restauração falhou e o navegador também não conseguiu reverter todos os dados anteriores. Verifique o perfil e o backup antes de tentar novamente."
      : "A restauração falhou; os dados anteriores foram mantidos.");
  }
}

// ------------------------------
// PACOTE SEMANAL / MAPA
// ------------------------------
export function loadWeeklyBundle(): WeeklyBundle | null {
  try {
    const raw = localStorage.getItem(BUNDLE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isWeeklyBundle(parsed) ? parsed : null;
  } catch (error) {
    console.error("Erro ao carregar leituras da semana:", error);
    return null;
  }
}

export function clearWeeklyBundle(): void {
  try {
    localStorage.removeItem(BUNDLE_KEY);
  } catch (error) {
    console.error("Erro ao remover a semana salva:", error);
    throw new Error("Não foi possível remover a semana salva no navegador.");
  }
}

export function saveWeeklyBundle(bundle: WeeklyBundle): void {
  try {
    localStorage.setItem(BUNDLE_KEY, JSON.stringify(bundle));
  } catch (error) {
    console.error("Erro ao salvar leituras no localStorage:", error);
    throw new Error("O armazenamento do navegador está cheio.");
  }
}

// ------------------------------
// LEITURA PERSONALIZADA DA IA
// ------------------------------
export function loadSavedAiReading(): string {
  try {
    return localStorage.getItem(AI_READING_KEY) || "";
  } catch {
    return "";
  }
}

export function saveAiReading(text: string): void {
  try {
    localStorage.setItem(AI_READING_KEY, text);
  } catch (err) {
    console.error("Erro ao salvar leitura da IA:", err);
  }
}

export function clearSavedAiReading(): void {
  try {
    localStorage.removeItem(AI_READING_KEY);
  } catch (err) {
    console.error("Erro ao remover leitura da IA:", err);
  }
}

export type SavedReadingId = "natal" | "current" | "yearly";

export function loadSavedReading(id: SavedReadingId): string {
  try {
    const saved = localStorage.getItem(`${EXPERIENCE_READING_PREFIX}${id}`);
    if (saved) return saved;
    return id === "natal" ? loadSavedAiReading() : "";
  } catch {
    return "";
  }
}

export function saveReading(id: SavedReadingId, text: string): void {
  try {
    localStorage.setItem(`${EXPERIENCE_READING_PREFIX}${id}`, text);
  } catch (error) {
    console.error("Erro ao salvar leitura no localStorage:", error);
    throw new Error("Não foi possível salvar esta leitura no navegador.");
  }
}

export function clearSavedReading(id: SavedReadingId): void {
  try {
    localStorage.removeItem(`${EXPERIENCE_READING_PREFIX}${id}`);
    if (id === "natal") localStorage.removeItem(AI_READING_KEY);
  } catch (error) {
    console.error("Erro ao remover leitura do localStorage:", error);
  }
}

// ------------------------------
// LIMPEZA GERAL DE DADOS
// ------------------------------
export function clearLocalData(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(BUNDLE_KEY);
    localStorage.removeItem(AI_READING_KEY);
    (['natal', 'current', 'yearly'] as SavedReadingId[]).forEach((id) => localStorage.removeItem(`${EXPERIENCE_READING_PREFIX}${id}`));
    localStorage.removeItem(TEST_ACCESS_KEY);
    const manifest = loadApplicationManifest();
    const mapKeys = new Set<string>(manifest?.mapIds.map((id) => `${MAP_KEY_PREFIX}${id}`) ?? []);
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(MAP_KEY_PREFIX)) mapKeys.add(key);
    }
    mapKeys.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(APPLICATION_MANIFEST_KEY);
  } catch (error) {
    console.error("Erro ao apagar dados locais:", error);
    throw new Error("Não foi possível apagar os dados do navegador.");
  }
}
