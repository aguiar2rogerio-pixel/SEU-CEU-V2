import type { BirthProfile, WeeklyBundle } from "./types";

const PROFILE_KEY = "seu_ceu_profile";
const BUNDLE_KEY = "seu_ceu_weekly_bundle";
const AI_READING_KEY = "seu_ceu_saved_ai_reading";
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
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BirthProfile;
  } catch (error) {
    console.error("Erro ao carregar perfil do localStorage:", error);
    return null;
  }
}

export function saveProfile(profile: BirthProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Erro ao salvar perfil no localStorage:", error);
    throw new Error("Não foi possível salvar os dados no navegador.");
  }
}

// ------------------------------
// PACOTE SEMANAL / MAPA
// ------------------------------
export function loadWeeklyBundle(): WeeklyBundle | null {
  try {
    const raw = localStorage.getItem(BUNDLE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeeklyBundle;
  } catch (error) {
    console.error("Erro ao carregar leituras da semana:", error);
    return null;
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

// ------------------------------
// LIMPEZA GERAL DE DADOS
// ------------------------------
export function clearLocalData(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(BUNDLE_KEY);
    localStorage.removeItem(AI_READING_KEY);
    localStorage.removeItem(TEST_ACCESS_KEY);
  } catch (error) {
    console.error("Erro ao apagar dados locais:", error);
    throw new Error("Não foi possível apagar os dados do navegador.");
  }
}
