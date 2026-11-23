import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Home, Map, Orbit, ShieldCheck, Sparkles, Sun, WifiOff, X } from "lucide-react";
import { ProfileForm } from "./components/ProfileForm";
import { TodayPage } from "./components/TodayPage";
import { MapPage, type MapPanelId } from "./components/MapPage";
import { RadarPage } from "./components/RadarPage";
import { WeekPage } from "./components/WeekPage";
import { ProfilePage } from "./components/ProfilePage";
import { PillarsPreview } from "./components/PillarsPreview";
import { ReadingExperiencePage, type ReadingExperienceId } from "./components/ReadingExperiencePage";
import { generateCurrentPrompt, generateNatalPrompt, generateWeeklyPrompt, generateYearlyPrompt } from "./lib/ai-prompts";
import { findGlobalAspects } from "./lib/aspects";
import { downloadBackup, parseBackup } from "./lib/backup";
import { calculateNatalChart, calculateWeek, currentLocalISODate, EPHEMERIS_MODEL_VERSION, formatWeekRange, getMondayISO } from "./lib/ephemeris";
import { calculateNatalExtensions, NATAL_EXTENSIONS_VERSION } from "./lib/natal-extensions";
import { createWeeklyReadings } from "./lib/readings";
import {
  clearLocalData, clearSavedReading, clearTestAccess, loadProfile, loadSavedReading,
  loadTestAccess, loadWeeklyBundle, restoreProfileAndBundle, saveProfile, saveReading, saveTestAccess, saveWeeklyBundle,
} from "./lib/storage";
import { isReusableWeeklyBundle } from "./lib/weekly-bundle";
import type { BirthProfile, DailyEphemeris, NatalChart, WeeklyBundle } from "./lib/types";

type TabId = "pillars" | "today" | "map" | "week" | "profile";
const NAV_ITEMS: { id: TabId; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Hoje", icon: Sun },
  { id: "map", label: "Meu mapa", icon: Orbit },
  { id: "week", label: "Semana", icon: CalendarDays },
  { id: "profile", label: "Perfil", icon: Map },
];

async function buildBundle(profile: BirthProfile): Promise<WeeklyBundle> {
  const baseNatal = calculateNatalChart(profile);
  const natal: NatalChart = {
    ...baseNatal,
    ...await calculateNatalExtensions(profile, baseNatal),
  };
  const days: DailyEphemeris[] = calculateWeek().map((day) => ({
    ...day,
    globalAspects: findGlobalAspects(day),
  }));
  const weekStart = getMondayISO();
  return {
    version: 1,
    ephemerisVersion: EPHEMERIS_MODEL_VERSION,
    weekStart,
    profileUpdatedAt: profile.updatedAt,
    calculatedAt: new Date().toISOString(),
    natal,
    days,
    readings: createWeeklyReadings(profile, natal, days),
  };
}

function hasNatalExtensions(natal: NatalChart): boolean {
  const pointIds = ["northNode", "southNode", "lilith", "chiron", "partOfFortune", "vertex"] as const;
  return natal.natalExtensionsVersion === NATAL_EXTENSIONS_VERSION &&
    Object.prototype.hasOwnProperty.call(natal, "angles") &&
    Object.prototype.hasOwnProperty.call(natal, "houses") &&
    pointIds.every((id) => Object.prototype.hasOwnProperty.call(natal.complementaryPoints ?? {}, id));
}

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function accuracyNotice(profile: BirthProfile): string | null {
  if (profile.birthTimeAccuracy === "unknown") {
    return "Horário desconhecido: a Lua natal, o Ascendente e elementos dependentes do horário ficam sem confirmação. Usamos 12h apenas como referência para os demais planetas.";
  }
  if (profile.birthTimeAccuracy === "approximate") {
    return "Horário aproximado: posições que mudam rapidamente podem variar. A leitura é uma referência, não um cálculo exato.";
  }
  if (!profile.timezoneConfirmed) {
    return "Confira o fuso horário: o valor atual do aparelho pode ser diferente do fuso do local e da época do nascimento.";
  }
  return null;
}

function App() {
  const online = useOnlineStatus();
  const [profile, setProfile] = useState<BirthProfile | null>(() => loadProfile());
  const [bundle, setBundle] = useState<WeeklyBundle | null>(null);
  const [hasTestAccess, setHasTestAccess] = useState(() => loadTestAccess());
  const [tab, setTab] = useState<TabId>(() => loadTestAccess() ? "today" : "pillars");
  const [selectedDate, setSelectedDate] = useState(currentLocalISODate());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [installEvent, setInstallEvent] = useState<Event | null>(null);

  const [readingExperience, setReadingExperience] = useState<ReadingExperienceId | null>(null);
  const [radarOpen, setRadarOpen] = useState(false);
  const [openMapPanels, setOpenMapPanels] = useState<MapPanelId[]>([]);
  const [savedReadings, setSavedReadings] = useState<Record<ReadingExperienceId, string>>(() => ({ natal: loadSavedReading("natal"), current: loadSavedReading("current"), yearly: loadSavedReading("yearly") }));
  const [inputReading, setInputReading] = useState<string>("");
  const [isEditingReading, setIsEditingReading] = useState<boolean>(false);
  const [copiedPromptType, setCopiedPromptType] = useState<string | null>(null);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault?.();
      setInstallEvent(event);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  useEffect(() => {
    if (!profile) {
      setBundle(null);
      return;
    }
    let cancelled = false;
    const cached = loadWeeklyBundle();
    if (isReusableWeeklyBundle(cached, profile)) {
      setBundle(cached);
      if (hasNatalExtensions(cached.natal)) return () => { cancelled = true; };
      void calculateNatalExtensions(profile, cached.natal).then((extensions) => {
        if (cancelled) return;
        const enriched: WeeklyBundle = {
          ...cached,
          natal: { ...cached.natal, ...extensions },
        };
        setBundle(enriched);
        try { saveWeeklyBundle(enriched); } catch { setError("O mapa foi ampliado, mas não coube no armazenamento do navegador."); }
      }).catch((calculationError: unknown) => {
        if (!cancelled) setError(calculationError instanceof Error ? calculationError.message : "Não foi possível ampliar os dados do mapa salvo.");
      });
      return () => { cancelled = true; };
    }
    void buildBundle(profile).then((freshBundle) => {
      if (cancelled) return;
      setBundle(freshBundle);
      try { saveWeeklyBundle(freshBundle); } catch { setError("A semana foi calculada, mas não coube no armazenamento do navegador."); }
    }).catch((calculationError: unknown) => {
      if (cancelled) return;
      setError(calculationError instanceof Error ? calculationError.message : "Não foi possível calcular seu mapa nesta tentativa.");
      setBundle(null);
    });
    return () => { cancelled = true; };
  }, [profile]);

  const todayISO = currentLocalISODate();
  const todayReading = useMemo(
    () => bundle?.readings.find((reading) => reading.date === todayISO) ?? null,
    [bundle, todayISO],
  );
  const selectedReading = useMemo(
    () => bundle?.readings.find((reading) => reading.date === selectedDate) ?? null,
    [bundle, selectedDate],
  );
  const selectedSky = useMemo(
    () => bundle?.days.find((day) => day.date === selectedDate) ?? null,
    [bundle, selectedDate],
  );
  const notice = profile ? accuracyNotice(profile) : null;

  function handleSaveProfile(nextProfile: BirthProfile) {
    const alreadyHadProfile = profile !== null;
    setError("");
    setSuccess("");
    try {
      saveProfile(nextProfile);
      setProfile(nextProfile);
      setSelectedDate(currentLocalISODate());
      if (alreadyHadProfile) {
        setTab(hasTestAccess ? "profile" : "pillars");
        setSuccess("Perfil atualizado neste aparelho. Seu mapa está sendo recalculado.");
      } else {
        clearTestAccess();
        setHasTestAccess(false);
        setTab("pillars");
        setSuccess("Perfil salvo neste aparelho. Seus três pilares estão sendo calculados.");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o perfil.");
    }
  }

  function handleGrantTestAccess() {
    const persisted = saveTestAccess();
    setHasTestAccess(true);
    setTab("today");
    setSelectedDate(currentLocalISODate());
    setSuccess(persisted
      ? "Acesso gratuito de teste liberado neste aparelho."
      : "Acesso de teste liberado nesta sessão; talvez não seja mantido se você fechar o aplicativo.");
  }

  async function recalculate() {
    if (!profile) return;
    setIsRecalculating(true);
    setError("");
    try {
      const fresh = await buildBundle(profile);
      saveWeeklyBundle(fresh);
      setBundle(fresh);
      setSuccess("Seu mapa e a semana foram recalculados neste aparelho.");
    } catch (calculationError) {
      setError(calculationError instanceof Error ? calculationError.message : "Não foi possível recalcular agora.");
    } finally {
      setIsRecalculating(false);
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setError("");
    setSuccess("");
    try {
      const backup = parseBackup(await file.text());
      const reusableBundle = isReusableWeeklyBundle(backup.weeklyBundle, backup.profile)
        ? backup.weeklyBundle
        : null;
      restoreProfileAndBundle(backup.profile, reusableBundle);
      setProfile(backup.profile);
      setBundle(reusableBundle);
      setTab(hasTestAccess ? "today" : "pillars");
      setSelectedDate(currentLocalISODate());
      setSuccess("Backup restaurado neste aparelho.");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Não foi possível restaurar o backup.");
    }
  }

  function handleDeleteData() {
    if (!window.confirm("Apagar o perfil e as leituras salvas neste aparelho? Se não tiver backup, não será possível recuperar estes dados.")) return;
    try {
      clearLocalData();
      setProfile(null);
      setBundle(null);
      setSavedReadings({ natal: "", current: "", yearly: "" });
      setReadingExperience(null);
      setHasTestAccess(false);
      setTab("pillars");
      setSuccess("");
      setError("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível apagar os dados.");
    }
  }

  async function promptInstall() {
    if (!installEvent) return;
    const promptEvent = installEvent as Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
    await promptEvent.prompt?.();
    setInstallEvent(null);
  }

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text);
    setCopiedPromptType(type);
    setTimeout(() => setCopiedPromptType(null), 3000);
  }

  function openReadingExperience(experience: ReadingExperienceId) {
    setRadarOpen(false);
    setReadingExperience(experience);
    setInputReading(savedReadings[experience]);
    setIsEditingReading(false);
    setCopiedPromptType(null);
  }

  function toggleMapPanel(panel: MapPanelId) {
    setOpenMapPanels((current) => current.includes(panel)
      ? current.filter((item) => item !== panel)
      : [...current, panel]);
  }

  function copyReadingPrompt() {
    if (!readingExperience || !bundle || !profile) return;
    const prompt = readingExperience === "natal"
      ? generateNatalPrompt(profile, bundle.natal)
      : readingExperience === "current"
        ? generateCurrentPrompt(profile, bundle.natal, bundle)
        : generateYearlyPrompt(profile, bundle.natal);
    copyToClipboard(prompt, `reading-${readingExperience}`);
  }

  function saveCurrentReading() {
    if (!readingExperience || !inputReading.trim()) return;
    saveReading(readingExperience, inputReading.trim());
    setSavedReadings((current) => ({ ...current, [readingExperience]: inputReading.trim() }));
    setIsEditingReading(false);
    setSuccess("Leitura guardada neste aparelho.");
  }

  function clearCurrentReading() {
    if (!readingExperience || !window.confirm("Deseja apagar esta leitura salva?")) return;
    clearSavedReading(readingExperience);
    setSavedReadings((current) => ({ ...current, [readingExperience]: "" }));
    setInputReading("");
    setSuccess("Leitura removida.");
  }

  if (!profile) {
    return (
      <main className="onboarding-shell">
        <div className="onboarding-brand"><BrandMark /><span>SEU CÉU</span></div>
        <div className="onboarding-copy">
          <span className="eyebrow"><Sparkles size={14} aria-hidden="true" /> SEU MAPA PESSOAL</span>
          <h1>Conheça seus três pilares.<br /><em>Com clareza, sem adivinhações.</em></h1>
          <p>Informe os dados do seu nascimento para ver Sol, Lua e Ascendente — com a interpretação de cada posição logo depois do cadastro.</p>
          <p className="onboarding-copy__detail">O horário ajuda a calcular a Lua e o Ascendente. Se não souber, você ainda pode continuar: indicaremos com transparência o que não puder ser confirmado.</p>
          <div className="onboarding-promise"><ShieldCheck size={17} aria-hidden="true" /><span>Seu nome, data e horário ficam neste aparelho. Não enviamos esses dados a uma IA; a lista de municípios é consultada no IBGE pelo estado escolhido.</span></div>
        </div>
        <section className="onboarding-form-panel"><ProfileForm onSave={handleSaveProfile} /></section>
        {error && <div className="toast toast--error" role="alert">{error}</div>}
        <p className="disclaimer onboarding-disclaimer">Astrologia como ferramenta simbólica de reflexão; não é previsão garantida nem orientação profissional.</p>
      </main>
    );
  }

  const weekStart = bundle?.weekStart ?? getMondayISO();
  const shortRange = formatWeekRange(weekStart);
  const birthTimeLabel = profile.birthTimeAccuracy === "unknown" ? "Horário desconhecido" : `${profile.birthTimeAccuracy === "approximate" ? "Aprox." : "Exato"} · ${profile.birthTime ?? ""}`;

  return (
    <div className={`app-shell${hasTestAccess ? "" : " app-shell--locked"}`}>
      <header className="topbar">
        <a className="brand" href="#hoje" onClick={(event) => { event.preventDefault(); setTab(hasTestAccess ? "today" : "pillars"); }} aria-label="Seu Céu, início">
          <BrandMark /><span>SEU CÉU</span>
        </a>
        <div className="topbar-actions">
          {hasTestAccess && tab !== "today" && (
            <button className="home-button" onClick={() => setTab("today")} aria-label="Voltar ao início" title="Voltar ao início">
              <Home size={16} aria-hidden="true" /><span className="home-button__label">Início</span>
            </button>
          )}
          {!online && <span className="offline-pill"><WifiOff size={13} aria-hidden="true" /> Offline</span>}
          {online && <span className="sync-pill"><span className="status-dot" /> No seu aparelho</span>}
          {installEvent && <button className="install-button" onClick={promptInstall}>Instalar</button>}
        </div>
      </header>

      {error && <div className="toast toast--error" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Fechar aviso"><X size={16} /></button></div>}
      {success && <div className="toast toast--success" role="status"><Check size={16} /><span>{success}</span><button onClick={() => setSuccess("")} aria-label="Fechar aviso"><X size={16} /></button></div>}

      {notice && tab !== "pillars" && <div className="accuracy-banner"><span className="accuracy-banner__icon">i</span><p>{notice}</p><button aria-label="Fechar aviso" onClick={(event) => event.currentTarget.parentElement?.remove()}><X size={16} /></button></div>}
      {!online && <div className="offline-banner"><WifiOff size={15} aria-hidden="true" /><span>Sem conexão. Esta semana e seu mapa estão disponíveis porque foram calculados neste aparelho.</span></div>}

      <main className="page-content">
        {tab === "pillars" && <PillarsPreview profile={profile} natal={bundle?.natal ?? null} onUnlock={handleGrantTestAccess} />}

        {tab === "today" && (
          <TodayPage
            profile={profile}
            bundle={bundle}
            todayISO={todayISO}
            shortRange={shortRange}
            todayReading={todayReading}
            isRecalculating={isRecalculating}
            onRecalculate={recalculate}
            onShowWeek={() => { setTab("week"); setSelectedDate(todayISO); }}
            onShowMap={() => { setReadingExperience(null); setRadarOpen(false); setTab("map"); }}
          />
        )}

        {tab === "map" && readingExperience && (
          <ReadingExperiencePage
            experience={readingExperience}
            profile={profile}
            natal={bundle?.natal ?? null}
            bundle={bundle}
            savedText={savedReadings[readingExperience]}
            inputText={inputReading}
            copied={copiedPromptType === `reading-${readingExperience}`}
            isEditing={isEditingReading}
            onBack={() => setReadingExperience(null)}
            onCopyPrompt={copyReadingPrompt}
            onEdit={() => { setInputReading(savedReadings[readingExperience]); setIsEditingReading(true); }}
            onClear={clearCurrentReading}
            onInputChange={setInputReading}
            onSave={saveCurrentReading}
            onCancelEdit={() => setIsEditingReading(false)}
          />
        )}

        {tab === "map" && radarOpen && !readingExperience && (
          <RadarPage natal={bundle?.natal ?? null} onBack={() => setRadarOpen(false)} />
        )}

        {tab === "map" && !readingExperience && !radarOpen && (
          <MapPage
            profile={profile}
            bundle={bundle}
            birthTimeLabel={birthTimeLabel}
            openPanels={openMapPanels}
            onTogglePanel={toggleMapPanel}
            onOpenRadar={() => { setReadingExperience(null); setRadarOpen(true); }}
            onOpenExperience={openReadingExperience}
          />
        )}

        {tab === "week" && (
          <WeekPage
            days={bundle?.days ?? []}
            shortRange={shortRange}
            calculatedAt={bundle?.calculatedAt ?? null}
            todayISO={todayISO}
            selectedDate={selectedDate}
            selectedReading={selectedReading}
            selectedSky={selectedSky}
            copiedPromptType={copiedPromptType}
            onSelectDate={setSelectedDate}
            onCopyWeeklyPrompt={() => {
              if (selectedSky) copyToClipboard(generateWeeklyPrompt(profile, selectedSky, shortRange), "week");
            }}
          />
        )}

        {tab === "profile" && (
          <ProfilePage
            profile={profile}
            onSaveProfile={handleSaveProfile}
            onExportBackup={() => { downloadBackup(profile, bundle); setSuccess("Backup exportado. Salve o arquivo em um local que você controle."); }}
            onImportBackup={(file) => void handleImport(file)}
            onDeleteData={handleDeleteData}
          />
        )}

        <footer className="app-footer"><span>SEU CÉU</span><p>Astrologia simbólica para reflexão pessoal. Não substitui orientação profissional.</p></footer>
      </main>

      {hasTestAccess && (
        <nav className="bottom-nav" aria-label="Navegação principal">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`nav-item ${tab === id ? "is-active" : ""}`} onClick={() => { if (id === "map") { setReadingExperience(null); setRadarOpen(false); } setTab(id); }} aria-current={tab === id ? "page" : undefined}>
              <Icon size={20} strokeWidth={tab === id ? 2.2 : 1.7} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span className="brand-mark__moon" /><span className="brand-mark__star">✦</span></span>;
}

export default App;
