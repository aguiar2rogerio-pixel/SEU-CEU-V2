import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Home, Map, Orbit, ShieldCheck, Sparkles, Sun, WifiOff, X, Upload } from "lucide-react";
import { ProfileForm } from "./components/ProfileForm";
import { TodayPage } from "./components/TodayPage";
import { MapPage, type MapPanelId } from "./components/MapPage";
import { RadarPage } from "./components/RadarPage";
import { WeekPage } from "./components/WeekPage";
import { ProfilePage } from "./components/ProfilePage";
import { PillarsPreview } from "./components/PillarsPreview";
import { ReadingExperiencePage, type ReadingExperienceId } from "./components/ReadingExperiencePage";
import { generateCurrentPrompt, generateDepthPrompt, generateNatalPrompt, generateWeeklyPrompt } from "./lib/ai-prompts";
import { findGlobalAspects } from "./lib/aspects";
import { downloadBackupV2, parseBackup } from "./lib/backup";
import { calculateNatalChart, calculateWeek, currentLocalISODate, EPHEMERIS_MODEL_VERSION, formatWeekRange, getMondayISO } from "./lib/ephemeris";
import { calculateNatalExtensions } from "./lib/natal-extensions";
import { createWeeklyReadings } from "./lib/readings";
import { clearLocalData, saveTestAccess } from "./lib/storage";
import {
  calculateProfileFingerprint, createEmptyMapRecord, deleteMapFromApplication,
  loadAllNatalMapRecords, loadApplicationManifest, migrateLegacyStorage, restoreApplicationState, restoreImportedApplicationState,
  updateMapInApplication,
} from "./lib/map-storage";
import type { ApplicationManifest, BirthProfile, DailyEphemeris, NatalChart, NatalMapRecord, WeeklyBundle } from "./lib/types";

type TabId = "pillars" | "today" | "map" | "week" | "profile";
const NAV_ITEMS: { id: TabId; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Hoje", icon: Sun },
  { id: "map", label: "Meu mapa", icon: Orbit },
  { id: "week", label: "Semana", icon: CalendarDays },
  { id: "profile", label: "Suas leituras", icon: Map },
];

async function calculateNatal(profile: BirthProfile): Promise<NatalChart> {
  const baseNatal = calculateNatalChart(profile);
  return { ...baseNatal, ...await calculateNatalExtensions(profile, baseNatal) };
}

async function buildBundle(profile: BirthProfile, natal: NatalChart): Promise<WeeklyBundle> {
  const days: DailyEphemeris[] = calculateWeek().map((day) => ({ ...day, globalAspects: findGlobalAspects(day) }));
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

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  return online;
}

function accuracyNotice(profile: BirthProfile): string | null {
  if (profile.birthTimeAccuracy === "unknown") return "Horário desconhecido: a Lua natal, o Ascendente e elementos dependentes do horário ficam sem confirmação. Usamos 12h apenas como referência para os demais planetas.";
  if (profile.birthTimeAccuracy === "approximate") return "Horário aproximado: posições que mudam rapidamente podem variar. A leitura é uma referência, não um cálculo exato.";
  if (!profile.timezoneConfirmed) return "Confira o fuso horário: o valor atual do aparelho pode ser diferente do fuso do local e da época do nascimento.";
  return null;
}

function initialState(): { manifest: ApplicationManifest | null; maps: NatalMapRecord[] } {
  const manifest = loadApplicationManifest() ?? migrateLegacyStorage();
  return { manifest, maps: manifest ? loadAllNatalMapRecords(manifest) : [] };
}

function App() {
  const online = useOnlineStatus();
  const [initial] = useState(initialState);
  const [manifest, setManifest] = useState<ApplicationManifest | null>(initial.manifest);
  const [maps, setMaps] = useState<NatalMapRecord[]>(initial.maps);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(initial.manifest?.primaryMapId ?? initial.maps[0]?.id ?? null);
  const [hasTestAccess, setHasTestAccess] = useState(() => initial.manifest?.access.testAccessGranted ?? false);
  const [tab, setTab] = useState<TabId>(() => initial.manifest?.primaryMapId && (initial.manifest.access.testAccessGranted) ? "today" : initial.manifest ? "profile" : "pillars");
  const [selectedDate, setSelectedDate] = useState(currentLocalISODate());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [readingExperience, setReadingExperience] = useState<ReadingExperienceId | null>(null);
  const [radarOpen, setRadarOpen] = useState(false);
  const [openMapPanels, setOpenMapPanels] = useState<MapPanelId[]>([]);
  const [inputReading, setInputReading] = useState("");
  const [isEditingReading, setIsEditingReading] = useState(false);
  const [copiedPromptType, setCopiedPromptType] = useState<string | null>(null);
  const [depthQuestion, setDepthQuestion] = useState("");
  const [depthPrompt, setDepthPrompt] = useState("");
  const [installEvent, setInstallEvent] = useState<Event | null>(null);

  useEffect(() => { const capture = (event: Event) => { event.preventDefault?.(); setInstallEvent(event); }; window.addEventListener("beforeinstallprompt", capture); return () => window.removeEventListener("beforeinstallprompt", capture); }, []);

  const primaryMap = useMemo(() => maps.find((map) => map.id === manifest?.primaryMapId) ?? null, [maps, manifest]);
  const activeMap = useMemo(() => maps.find((map) => map.id === selectedMapId) ?? primaryMap, [maps, selectedMapId, primaryMap]);
  const profile = activeMap?.profile ?? null;
  const primaryProfile = primaryMap?.profile ?? null;
  const bundle = primaryMap?.weeklyBundle ?? null;
  const isPrimary = Boolean(activeMap && activeMap.id === manifest?.primaryMapId);
  const savedReadings = activeMap?.readings ?? { natal: null, current: null, yearly: null };

  function reload(preferredId?: string | null) {
    const nextManifest = loadApplicationManifest();
    const nextMaps = nextManifest ? loadAllNatalMapRecords(nextManifest) : [];
    setManifest(nextManifest);
    setMaps(nextMaps);
    setSelectedMapId(preferredId ?? nextManifest?.primaryMapId ?? nextMaps[0]?.id ?? null);
    setHasTestAccess(nextManifest?.access.testAccessGranted ?? false);
  }

  useEffect(() => {
    const pending = maps.find((map) => !map.natal || map.calculationStatus !== "ready" || (map.id === manifest?.primaryMapId && !map.weeklyBundle));
    if (!pending) return;
    let cancelled = false;
    void (async () => {
      try {
        const natal = await calculateNatal(pending.profile);
        const weeklyBundle = pending.id === manifest?.primaryMapId ? await buildBundle(pending.profile, natal) : null;
        const updated: NatalMapRecord = { ...pending, natal, weeklyBundle, calculationStatus: "ready", natalExtensionsVersion: natal.natalExtensionsVersion ?? null, lastCalculatedAt: weeklyBundle?.calculatedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
        if (!cancelled) { updateMapInApplication(updated); reload(pending.id); }
      } catch (calculationError) { if (!cancelled) setError(calculationError instanceof Error ? calculationError.message : "Não foi possível calcular este mapa."); }
    })();
    return () => { cancelled = true; };
  }, [maps, manifest?.primaryMapId]);

  const todayISO = currentLocalISODate();
  const todayReading = bundle?.readings.find((reading) => reading.date === todayISO) ?? null;
  const selectedReading = bundle?.readings.find((reading) => reading.date === selectedDate) ?? null;
  const selectedSky = bundle?.days.find((day) => day.date === selectedDate) ?? null;
  const notice = profile ? accuracyNotice(profile) : null;

  async function handleSaveMap(nextProfile: BirthProfile, mapId: string | null) {
    setError(""); setSuccess("");
    try {
      const existing = mapId ? maps.find((map) => map.id === mapId) ?? null : null;
      const shouldBePrimary = !existing && !manifest?.primaryMapId;
      if (existing && calculateProfileFingerprint(existing.profile) === calculateProfileFingerprint(nextProfile)) {
        const updated: NatalMapRecord = { ...existing, profile: nextProfile, readings: Object.fromEntries(Object.entries(existing.readings).map(([key, reading]) => [key, reading ? { ...reading, profileName: nextProfile.name } : null])) as NatalMapRecord["readings"], updatedAt: new Date().toISOString() };
        updateMapInApplication(updated); reload(existing.id); setSuccess("Nome atualizado. O cálculo e a interpretação foram preservados."); return;
      }
      const base = existing ? { ...existing, profile: nextProfile } : createEmptyMapRecord(nextProfile);
      const natal = await calculateNatal(nextProfile);
      const weeklyBundle = shouldBePrimary ? await buildBundle(nextProfile, natal) : existing?.id === manifest?.primaryMapId ? await buildBundle(nextProfile, natal) : null;
      const updated: NatalMapRecord = { ...base, profile: nextProfile, natal, weeklyBundle, readings: existing ? { ...existing.readings, natal: null } : base.readings, calculationFingerprint: calculateProfileFingerprint(nextProfile), calculationStatus: "ready", natalExtensionsVersion: natal.natalExtensionsVersion ?? null, lastCalculatedAt: weeklyBundle?.calculatedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (existing) updateMapInApplication(updated); else {
        const now = new Date().toISOString();
        const nextManifest: ApplicationManifest = { schemaVersion: 2, primaryMapId: shouldBePrimary ? updated.id : null, mapIds: [updated.id], access: { testAccessGranted: hasTestAccess }, createdAt: now, updatedAt: now };
        restoreApplicationState(nextManifest, [updated]);
      }
      reload(updated.id); setTab(shouldBePrimary ? (hasTestAccess ? "today" : "pillars") : "map"); setSuccess(existing ? "Dados natais atualizados. A interpretação natal anterior foi removida e o mapa foi recalculado." : "Novo mapa salvo neste aparelho.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar este mapa."); }
  }

  async function handleMakePrimary(id: string) {
    const chosen = maps.find((map) => map.id === id);
    if (!chosen) return;
    try {
      const now = new Date().toISOString();
      const nextMaps = await Promise.all(maps.map(async (map) => {
        if (map.id === id) { const natal = map.natal ?? await calculateNatal(map.profile); return { ...map, natal, weeklyBundle: await buildBundle(map.profile, natal), calculationStatus: "ready" as const, natalExtensionsVersion: natal.natalExtensionsVersion ?? null, lastCalculatedAt: new Date().toISOString(), readings: { ...map.readings }, updatedAt: now }; }
        if (map.id === manifest?.primaryMapId) return { ...map, weeklyBundle: null, readings: { natal: map.readings.natal, current: null, yearly: null }, updatedAt: now };
        return map;
      }));
      const nextManifest: ApplicationManifest = { ...(manifest as ApplicationManifest), primaryMapId: id, updatedAt: now };
      restoreApplicationState(nextManifest, nextMaps); reload(id); setTab("today"); setReadingExperience(null); setSuccess("Mapa principal transferido. Hoje e Semana agora usam este mapa.");
    } catch (switchError) { setError(switchError instanceof Error ? switchError.message : "Não foi possível transferir o mapa principal."); }
  }

  function handleDeleteMap(id: string) {
    const map = maps.find((item) => item.id === id);
    if (!map || !window.confirm(`Excluir o mapa de ${map.profile.name}? Essa ação não afetará os outros mapas.`)) return;
    try { deleteMapFromApplication(id); const nextPrimary = id === manifest?.primaryMapId ? null : manifest?.primaryMapId; reload(nextPrimary); setReadingExperience(null); setRadarOpen(false); setTab(nextPrimary ? "today" : "profile"); setSuccess("Mapa excluído sem alterar os demais mapas."); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir este mapa."); }
  }

  function handleSelectMap(id: string) { setSelectedMapId(id); setReadingExperience(null); setRadarOpen(false); setTab("map"); }

  function handleGrantTestAccess() {
    const persisted = saveTestAccess();
    if (manifest) { const next = { ...manifest, access: { testAccessGranted: true }, updatedAt: new Date().toISOString() }; restoreApplicationState(next, maps); reload(primaryMap?.id); }
    setHasTestAccess(true); setTab(primaryMap ? "today" : "profile"); setSelectedDate(todayISO); setSuccess(persisted ? "Acesso gratuito de teste liberado neste aparelho." : "Acesso de teste liberado nesta sessão; talvez não seja mantido se você fechar o aplicativo.");
  }

  async function recalculate() {
    if (!primaryMap) return;
    setIsRecalculating(true); setError("");
    try { const natal = await calculateNatal(primaryMap.profile); const updated = { ...primaryMap, natal, weeklyBundle: await buildBundle(primaryMap.profile, natal), calculationStatus: "ready" as const, natalExtensionsVersion: natal.natalExtensionsVersion ?? null, lastCalculatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; updateMapInApplication(updated); reload(primaryMap.id); setSuccess("Seu mapa principal e a semana foram recalculados neste aparelho."); } catch (calculationError) { setError(calculationError instanceof Error ? calculationError.message : "Não foi possível recalcular agora."); } finally { setIsRecalculating(false); }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const currentAccess = hasTestAccess;
      if (backup.version === 2) {
        const importedManifest = { ...backup.manifest, access: { testAccessGranted: currentAccess } };
        restoreImportedApplicationState(importedManifest, backup.maps, currentAccess); reload(importedManifest.primaryMapId); setSelectedDate(todayISO); setTab(importedManifest.primaryMapId && currentAccess ? "today" : "profile"); setSuccess("Backup versão 2 restaurado. O acesso deste aparelho foi preservado."); return;
      }
      const map = createEmptyMapRecord(backup.profile);
      const now = new Date().toISOString();
      const migrated = { ...map, natal: backup.weeklyBundle?.natal ?? null, weeklyBundle: backup.weeklyBundle, calculationStatus: backup.weeklyBundle ? "ready" as const : "pending" as const, natalExtensionsVersion: backup.weeklyBundle?.natal.natalExtensionsVersion ?? null, lastCalculatedAt: backup.weeklyBundle?.calculatedAt ?? null, updatedAt: now };
      const importedManifest: ApplicationManifest = { schemaVersion: 2, primaryMapId: migrated.id, mapIds: [migrated.id], access: { testAccessGranted: currentAccess }, createdAt: now, updatedAt: now };
      restoreImportedApplicationState(importedManifest, [migrated], currentAccess); reload(migrated.id); setTab(currentAccess ? "today" : "profile"); setSuccess("Backup compatível restaurado. O acesso deste aparelho foi preservado.");
    } catch (importError) { setError(importError instanceof Error ? importError.message : "Não foi possível restaurar o backup."); }
  }

  function handleDeleteData() {
    if (!window.confirm("Apagar todos os mapas, leituras e o acesso deste aparelho? Se não tiver backup, não será possível recuperar estes dados.")) return;
    try { clearLocalData(); setManifest(null); setMaps([]); setSelectedMapId(null); setHasTestAccess(false); setReadingExperience(null); setRadarOpen(false); setTab("pillars"); setSuccess(""); setError(""); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Não foi possível apagar os dados."); }
  }

  function openReadingExperience(experience: ReadingExperienceId) { if (!activeMap || (!isPrimary && experience !== "natal")) return; setRadarOpen(false); setReadingExperience(experience); setInputReading(savedReadings[experience]?.text ?? ""); setIsEditingReading(false); setCopiedPromptType(null); if (experience === "yearly") { setDepthQuestion(""); setDepthPrompt(""); } }
  function copyToClipboard(text: string, type: string) { void navigator.clipboard.writeText(text); setCopiedPromptType(type); setTimeout(() => setCopiedPromptType(null), 3000); }
  function copyReadingPrompt() { if (!readingExperience || !activeMap?.natal || !profile) return; const prompt = readingExperience === "natal" ? generateNatalPrompt(profile, activeMap.natal) : readingExperience === "current" && bundle ? generateCurrentPrompt(primaryProfile as BirthProfile, activeMap.natal, bundle) : depthPrompt; if (prompt) copyToClipboard(prompt, `reading-${readingExperience}`); }
  function saveCurrentReading() { if (!readingExperience || !activeMap || !inputReading.trim()) return; const updated = { ...activeMap, readings: { ...activeMap.readings, [readingExperience]: { text: inputReading.trim(), type: readingExperience, savedAt: new Date().toISOString(), calculationFingerprint: activeMap.calculationFingerprint, profileName: activeMap.profile.name, status: "current" as const } }, updatedAt: new Date().toISOString() }; updateMapInApplication(updated); reload(activeMap.id); setIsEditingReading(false); setSuccess("Leitura guardada neste aparelho."); }
  function clearCurrentReading() { if (!readingExperience || !activeMap || !window.confirm("Deseja apagar esta leitura salva?")) return; const updated = { ...activeMap, readings: { ...activeMap.readings, [readingExperience]: null }, updatedAt: new Date().toISOString() }; updateMapInApplication(updated); reload(activeMap.id); setInputReading(""); setSuccess("Leitura removida."); }
  function toggleMapPanel(panel: MapPanelId) { setOpenMapPanels((current) => current.includes(panel) ? current.filter((item) => item !== panel) : [...current, panel]); }
  function exploreDepthMap() { if (!activeMap?.natal || !profile || !depthQuestion.trim()) return; setDepthPrompt(generateDepthPrompt(profile, activeMap.natal, depthQuestion)); setCopiedPromptType(null); }
  async function promptInstall() { if (!installEvent) return; const event = installEvent as Event & { prompt?: () => Promise<void> }; await event.prompt?.(); setInstallEvent(null); }

  if (!activeMap && !manifest) return <main className="onboarding-shell"><div className="onboarding-brand"><BrandMark /><span>SEU CÉU</span></div><div className="onboarding-copy"><span className="eyebrow"><Sparkles size={14} /> SEU MAPA PESSOAL</span><h1>Conheça seus três pilares.<br /><em>Com clareza, sem adivinhações.</em></h1><p>Informe os dados do seu nascimento para ver Sol, Lua e Ascendente — com a interpretação de cada posição logo depois do cadastro.</p><p className="onboarding-copy__detail">Você também pode restaurar um backup existente antes de criar um novo mapa.</p><div className="onboarding-promise"><ShieldCheck size={17} /><span>Seus dados ficam neste aparelho. O aplicativo não envia seu mapa automaticamente para uma IA.</span></div></div><section className="onboarding-form-panel"><ProfileForm onSave={(profileToSave) => void handleSaveMap(profileToSave, null)} /><label className="button button--secondary file-button onboarding-restore"><Upload size={17} /> Restaurar backup<input type="file" accept="application/json,.json" onChange={(event) => void handleImport(event.target.files?.[0])} /></label></section>{error && <div className="toast toast--error" role="alert">{error}</div>}<p className="disclaimer onboarding-disclaimer">Astrologia como ferramenta simbólica de reflexão; não é previsão garantida nem orientação profissional.</p></main>;

  const weekStart = bundle?.weekStart ?? getMondayISO();
  const shortRange = formatWeekRange(weekStart);
  const birthTimeLabel = profile ? profile.birthTimeAccuracy === "unknown" ? "Horário desconhecido" : `${profile.birthTimeAccuracy === "approximate" ? "Aprox." : "Exato"} · ${profile.birthTime ?? ""}` : "";
  const canUsePrimary = Boolean(primaryMap && hasTestAccess);

  return <div className={`app-shell${hasTestAccess ? "" : " app-shell--locked"}`}><header className="topbar"><a className="brand" href="#hoje" onClick={(event) => { event.preventDefault(); if (primaryMap) { setSelectedMapId(primaryMap.id); setTab(hasTestAccess ? "today" : "profile"); } }} aria-label="Seu Céu, início"><BrandMark /><span>SEU CÉU</span></a><div className="topbar-actions">{hasTestAccess && tab !== "today" && <button className="home-button" onClick={() => { if (primaryMap) { setSelectedMapId(primaryMap.id); setReadingExperience(null); setTab("today"); } }} aria-label="Voltar ao início"><Home size={16} /><span className="home-button__label">Início</span></button>}{!online ? <span className="offline-pill"><WifiOff size={13} /> Offline</span> : <span className="sync-pill"><span className="status-dot" /> No seu aparelho</span>}{installEvent && <button className="install-button" onClick={promptInstall}>Instalar</button>}</div></header>{error && <div className="toast toast--error" role="alert"><span>{error}</span><button onClick={() => setError("")}><X size={16} /></button></div>}{success && <div className="toast toast--success" role="status"><Check size={16} /><span>{success}</span><button onClick={() => setSuccess("")}><X size={16} /></button></div>}{notice && tab !== "pillars" && <div className="accuracy-banner"><span className="accuracy-banner__icon">i</span><p>{notice}</p><button onClick={(event) => event.currentTarget.parentElement?.remove()}><X size={16} /></button></div>}{!online && <div className="offline-banner"><WifiOff size={15} /><span>Sem conexão. Os dados disponíveis neste aparelho continuam acessíveis.</span></div>}
    <main className="page-content">
      {tab === "pillars" && primaryProfile && primaryMap?.natal && <PillarsPreview profile={primaryProfile} natal={primaryMap.natal} onUnlock={handleGrantTestAccess} />}
      {tab === "today" && canUsePrimary && <TodayPage profile={primaryProfile as BirthProfile} bundle={bundle} todayISO={todayISO} shortRange={shortRange} todayReading={todayReading} isRecalculating={isRecalculating} onRecalculate={recalculate} onShowWeek={() => { setSelectedMapId(primaryMap!.id); setTab("week"); setSelectedDate(todayISO); }} onShowMap={() => { setSelectedMapId(primaryMap!.id); setReadingExperience(null); setRadarOpen(false); setTab("map"); }} />}
      {tab === "map" && activeMap?.natal && readingExperience && <ReadingExperiencePage experience={readingExperience} profile={profile as BirthProfile} natal={activeMap.natal} bundle={isPrimary ? bundle : null} savedText={savedReadings[readingExperience]?.text ?? ""} inputText={inputReading} copied={copiedPromptType === `reading-${readingExperience}`} isEditing={isEditingReading} onBack={() => setReadingExperience(null)} onCopyPrompt={copyReadingPrompt} onEdit={() => { setInputReading(savedReadings[readingExperience]?.text ?? ""); setIsEditingReading(true); }} onClear={clearCurrentReading} onInputChange={setInputReading} onSave={saveCurrentReading} onCancelEdit={() => setIsEditingReading(false)} depthQuestion={depthQuestion} depthPromptReady={Boolean(depthPrompt)} onDepthQuestionChange={(value) => { setDepthQuestion(value); setDepthPrompt(""); }} onDepthExplore={exploreDepthMap} />}
      {tab === "map" && activeMap?.natal && radarOpen && !readingExperience && <RadarPage natal={activeMap.natal} onBack={() => setRadarOpen(false)} />}
      {tab === "map" && activeMap?.natal && !readingExperience && !radarOpen && <MapPage profile={profile as BirthProfile} natal={activeMap.natal} isPrimary={isPrimary} birthTimeLabel={birthTimeLabel} openPanels={openMapPanels} onTogglePanel={toggleMapPanel} onOpenRadar={() => { setReadingExperience(null); setRadarOpen(true); }} onOpenExperience={openReadingExperience} />}
      {tab === "week" && canUsePrimary && <WeekPage days={bundle?.days ?? []} readings={bundle?.readings ?? []} shortRange={shortRange} calculatedAt={bundle?.calculatedAt ?? null} todayISO={todayISO} selectedDate={selectedDate} selectedReading={selectedReading} selectedSky={selectedSky} copiedPromptType={copiedPromptType} onSelectDate={setSelectedDate} onCopyWeeklyPrompt={() => { if (selectedSky && bundle && primaryProfile) copyToClipboard(generateWeeklyPrompt(primaryProfile, bundle.natal, selectedSky, shortRange), "week"); }} />}
      {tab === "profile" && <ProfilePage maps={maps} primaryMapId={manifest?.primaryMapId ?? null} selectedMapId={selectedMapId} onSelectMap={handleSelectMap} onSaveMap={(nextProfile, mapId) => void handleSaveMap(nextProfile, mapId)} onMakePrimary={(id) => void handleMakePrimary(id)} onDeleteMap={handleDeleteMap} onExportBackup={() => { if (manifest) { downloadBackupV2(manifest, maps); setSuccess("Backup exportado. Salve o arquivo em um local que você controle."); } }} onImportBackup={(file) => void handleImport(file)} onDeleteData={handleDeleteData} />}
      <footer className="app-footer"><span>SEU CÉU</span><p>Astrologia simbólica para reflexão pessoal. Não substitui orientação profissional.</p></footer>
    </main>{hasTestAccess && <nav className="bottom-nav" aria-label="Navegação principal">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${tab === id ? "is-active" : ""}`} disabled={(id === "today" || id === "week") && !primaryMap} onClick={() => { if (id === "today" || id === "week") setSelectedMapId(primaryMap?.id ?? null); if (id === "map") { setReadingExperience(null); setRadarOpen(false); } setTab(id); }}><Icon size={20} /><span>{label}</span></button>)}</nav>}</div>;
}

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><span className="brand-mark__moon" /><span className="brand-mark__star">✦</span></span>; }
export default App;
