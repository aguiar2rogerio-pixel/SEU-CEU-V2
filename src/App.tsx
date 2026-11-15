import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays, Check, ChevronRight, Copy, Download, FileText, Map, Moon, Orbit,
  RefreshCw, ShieldCheck, Sparkles, Sun, Trash2, Upload, WifiOff, X,
} from "lucide-react";
import { ProfileForm } from "./components/ProfileForm";
import { ReadingCard } from "./components/ReadingCard";
import { PillarsPreview } from "./components/PillarsPreview";
import { generateNatalPrompt, generateWeeklyPrompt } from "./lib/ai-prompts";
import { findGlobalAspects } from "./lib/aspects";
import { downloadBackup, parseBackup } from "./lib/backup";
import { calculateNatalChart, calculateWeek, currentLocalISODate, EPHEMERIS_MODEL_VERSION, formatDateISO, formatWeekRange, getMondayISO, PLANETS } from "./lib/ephemeris";
import { createWeeklyReadings, weeklyLead } from "./lib/readings";
import {
  clearLocalData, clearSavedAiReading, clearTestAccess, loadProfile, loadSavedAiReading,
  loadTestAccess, loadWeeklyBundle, saveAiReading, saveProfile, saveTestAccess, saveWeeklyBundle,
} from "./lib/storage";
import type { BirthProfile, DailyEphemeris, WeeklyBundle } from "./lib/types";

type TabId = "pillars" | "today" | "map" | "week" | "profile";
const NAV_ITEMS: { id: TabId; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Hoje", icon: Sun },
  { id: "map", label: "Meu mapa", icon: Orbit },
  { id: "week", label: "Semana", icon: CalendarDays },
  { id: "profile", label: "Perfil", icon: Map },
];

function buildBundle(profile: BirthProfile): WeeklyBundle {
  const natal = calculateNatalChart(profile);
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

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Você";
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

function dayName(isoDate: string, short = false): string {
  return formatDateISO(isoDate, { weekday: short ? "short" : "long" });
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

  // Estados para o Gerador de Prompts e Leitura Guardada da IA
  const [aiReadingText, setAiReadingText] = useState<string>(() => loadSavedAiReading());
  const [inputAiText, setInputAiText] = useState<string>("");
  const [isEditingAi, setIsEditingAi] = useState<boolean>(false);
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
    const expectedWeek = getMondayISO();
    const cached = loadWeeklyBundle();
    if (cached && cached.weekStart === expectedWeek && cached.profileUpdatedAt === profile.updatedAt) {
      setBundle(cached);
      return;
    }
    try {
      const freshBundle = buildBundle(profile);
      setBundle(freshBundle);
      try { saveWeeklyBundle(freshBundle); } catch { setError("A semana foi calculada, mas não coube no armazenamento do navegador."); }
    } catch (calculationError) {
      setError(calculationError instanceof Error ? calculationError.message : "Não foi possível calcular seu mapa nesta tentativa.");
      setBundle(null);
    }
  }, [profile]);

  const selectedReading = useMemo(
    () => bundle?.readings.find((reading) => reading.date === selectedDate) ?? bundle?.readings[0] ?? null,
    [bundle, selectedDate],
  );
  const selectedSky = useMemo(
    () => bundle?.days.find((day) => day.date === selectedDate) ?? bundle?.days[0] ?? null,
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

  function recalculate() {
    if (!profile) return;
    setIsRecalculating(true);
    setError("");
    try {
      const fresh = buildBundle(profile);
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
      saveProfile(backup.profile);
      if (backup.weeklyBundle) saveWeeklyBundle(backup.weeklyBundle);
      setProfile(backup.profile);
      setBundle(backup.weeklyBundle);
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
      setAiReadingText("");
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

  function handleSaveAiText() {
    if (!inputAiText.trim()) return;
    saveAiReading(inputAiText);
    setAiReadingText(inputAiText);
    setIsEditingAi(false);
    setInputAiText("");
    setSuccess("Leitura da IA salva no aparelho com sucesso!");
  }

  function handleClearAiText() {
    if (window.confirm("Deseja apagar a leitura salva da IA?")) {
      clearSavedAiReading();
      setAiReadingText("");
      setSuccess("Leitura da IA removida.");
    }
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
  const todayISO = currentLocalISODate();
  const shortRange = formatWeekRange(weekStart);
  const selectedDayLabel = selectedDate === todayISO ? "HOJE" : dayName(selectedDate).toUpperCase();
  const birthTimeLabel = profile.birthTimeAccuracy === "unknown" ? "Horário desconhecido" : `${profile.birthTimeAccuracy === "approximate" ? "Aprox." : "Exato"} · ${profile.birthTime ?? ""}`;

  return (
    <div className={`app-shell${hasTestAccess ? "" : " app-shell--locked"}`}>
      <header className="topbar">
        <a className="brand" href="#hoje" onClick={(event) => { event.preventDefault(); setTab(hasTestAccess ? "today" : "pillars"); }} aria-label="Seu Céu, início">
          <BrandMark /><span>SEU CÉU</span>
        </a>
        <div className="topbar-actions">
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
          <>
            <section className="greeting-block">
              <div>
                <span className="eyebrow">{formatDateISO(todayISO, { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</span>
                <h1>Olá, {firstName(profile.name)}<span className="greeting-period">.</span></h1>
                <p>Seu céu de {shortRange}</p>
              </div>
              <button className="icon-button" aria-label="Recalcular a semana" title="Recalcular a semana" onClick={recalculate} disabled={isRecalculating}>
                <RefreshCw className={isRecalculating ? "spin" : ""} size={18} />
              </button>
            </section>

            <section className="hero-reading">
              <div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" />
              <div className="hero-stars"><span /><span /><span /></div>
              <div className="hero-reading__content">
                <span className="eyebrow eyebrow--gold"><Sparkles size={13} aria-hidden="true" /> SEU DESTAQUE DA SEMANA</span>
                <h2>{bundle ? weeklyLead(bundle.natal, bundle.days) : "Seu céu está sendo preparado"}</h2>
                <p>{shortRange} <span className="hero-dot">·</span> calculado {bundle ? formatDateISO(bundle.calculatedAt.slice(0, 10), { day: "numeric", month: "short" }) : "agora"}</p>
                <button className="text-link text-link--gold" onClick={() => { setTab("week"); setSelectedDate(todayISO); }}>Ver minha semana <ChevronRight size={16} /></button>
              </div>
              <div className="hero-moon" aria-hidden="true"><span /></div>
            </section>

            {selectedReading && (
              <section className="section-block">
                <SectionHeading eyebrow={selectedDayLabel} title="Seu ponto de atenção" />
                <ReadingCard reading={selectedReading} />
              </section>
            )}

            <section className="section-block">
              <div className="section-heading-row">
                <SectionHeading eyebrow="DO SEU MAPA" title="Três referências" />
                <button className="text-link" onClick={() => setTab("map")}>Ver mapa <ChevronRight size={15} /></button>
              </div>
              <div className="sign-summary">
                <SignTile label="Sol" position={bundle?.natal.sun ?? null} icon={<Sun size={17} />} />
                <SignTile label="Lua" position={bundle?.natal.moon ?? null} icon={<Moon size={17} />} />
                <SignTile label="Ascendente" position={bundle?.natal.ascendant ?? null} icon={<Orbit size={17} />} />
              </div>
              <p className="tiny-note">O Ascendente é calculado com base na data, hora e coordenadas geográficas informadas.</p>
              
              <div className="pillars-return-link">
                <button className="text-link" onClick={() => setTab("pillars")}>
                  Rever a explicação dos três pilares <ChevronRight size={15} />
                </button>
              </div>
            </section>

            <section className="section-block sky-section">
              <SectionHeading eyebrow="MOVIMENTO COMPARTILHADO" title="O céu em movimento" />
              <SkySummary days={bundle?.days ?? []} />
            </section>
          </>
        )}

        {tab === "map" && (
          <>
            <section className="page-intro">
              <span className="eyebrow">SEU MAPA NATAL</span>
              <h1>O seu ponto de partida.</h1>
              <p>Posições calculadas localmente a partir dos dados que você informou.</p>
            </section>
            <div className="map-meta-card"><div><span>HORÁRIO</span><strong>{birthTimeLabel}</strong></div><div><span>LOCAL</span><strong>{profile.birthPlace || "Não informado"}</strong></div><div><span>FUSO</span><strong>{profile.birthTimezone}</strong></div></div>
            {profile.birthTimeAccuracy === "unknown" && <div className="inline-notice">Sem horário de nascimento, a Lua natal e o Ascendente não são exibidos.</div>}
            
            {bundle?.natal.ascendant && (
              <div className="planet-list" style={{ marginBottom: "1rem" }}>
                <article className="planet-row">
                  <div className="planet-symbol"><Orbit size={18} /></div>
                  <div className="planet-row__name"><strong>Ascendente</strong><span>Horizonte Leste · {bundle.natal.ascendant.longitude.toFixed(1)}°</span></div>
                  <div className="planet-row__sign"><strong>{bundle.natal.ascendant.sign}</strong><span>{bundle.natal.ascendant.degree.toFixed(1)}°</span></div>
                </article>
              </div>
            )}

            <div className="planet-list">
              {PLANETS.map((planet) => {
                const position = bundle?.natal[planet.id] ?? null;
                return (
                  <article className={`planet-row ${!position ? "planet-row--unknown" : ""}`} key={planet.id}>
                    <div className="planet-symbol">{planet.id === "sun" ? <Sun size={19} /> : planet.id === "moon" ? <Moon size={19} /> : <Orbit size={18} />}</div>
                    <div className="planet-row__name"><strong>{planet.name}</strong><span>{position ? `Longitude tropical · ${position.longitude.toFixed(1)}°` : "Horário necessário para estimar"}</span></div>
                    <div className="planet-row__sign">{position ? <><strong>{position.sign}</strong><span>{position.degree.toFixed(1)}°</span></> : <span>Não informado</span>}</div>
                  </article>
                );
              })}
            </div>
            <div className="explain-card"><ShieldCheck size={17} /><p>Os graus vêm do Astronomy Engine, executado no aparelho. A lista mostra posições geocêntricas tropicais e o Ascendente local.</p></div>

            <section className="section-block" style={{ marginTop: "2rem", background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "16px", border: "1px solid rgba(240, 198, 116, 0.2)" }}>
              <SectionHeading eyebrow="ANÁLISE DE IA" title="Análise Aprofundada com IA" />
              <p style={{ fontSize: "0.9rem", color: "#a0a0b0", marginBottom: "1rem" }}>
                Copie o comando estruturado abaixo com seus dados exatos e use no ChatGPT, Gemini ou Claude para gerar uma leitura completa.
              </p>

              <button
                className="button button--secondary"
                style={{ width: "100%", justifyContent: "center", marginBottom: "1.5rem", borderColor: "#f0c674", color: "#f0c674" }}
                onClick={() => copyToClipboard(generateNatalPrompt(profile, bundle?.natal ?? null), "natal")}
              >
                {copiedPromptType === "natal" ? <Check size={18} /> : <Copy size={18} />}
                {copiedPromptType === "natal" ? "Prompt do Mapa Copiado!" : "Copiar Prompt do Mapa para IA"}
              </button>

              {aiReadingText && !isEditingAi ? (
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "#f0c674", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <FileText size={15} /> Sua Análise Salva
                    </span>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => { setInputAiText(aiReadingText); setIsEditingAi(true); }} style={{ background: "transparent", border: "none", color: "#a0a0b0", cursor: "pointer", fontSize: "0.85rem" }}>
                        Editar
                      </button>
                      <button onClick={handleClearAiText} style={{ background: "transparent", border: "none", color: "#ebcb8b", cursor: "pointer" }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#e5e9f0" }}>
                    {aiReadingText}
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#a0a0b0", marginBottom: "0.5rem" }}>
                    Cole aqui a resposta recebida da sua IA para guardar no aparelho:
                  </label>
                  <textarea
                    rows={5}
                    style={{ width: "100%", background: "#11111a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "0.75rem", color: "#fff", fontSize: "0.9rem", resize: "vertical", marginBottom: "0.75rem" }}
                    placeholder="Cole a resposta do ChatGPT / Gemini aqui..."
                    value={inputAiText}
                    onChange={(e) => setInputAiText(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="button button--primary" onClick={handleSaveAiText} style={{ flex: 1, justifyContent: "center" }}>
                      Salvar Leitura no Aparelho
                    </button>
                    {isEditingAi && (
                      <button className="button button--secondary" onClick={() => setIsEditingAi(false)}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "week" && (
          <>
            <section className="page-intro page-intro--week">
              <span className="eyebrow">SEGUNDA A DOMINGO</span>
              <h1>Sua semana, em perspectiva.</h1>
              <p>{shortRange} <span className="hero-dot">·</span> última leitura calculada {bundle ? formatDateISO(bundle.calculatedAt.slice(0, 10), { day: "numeric", month: "short" }) : "—"}</p>
            </section>
            <div className="week-strip" role="tablist" aria-label="Dias da semana">
              {(bundle?.days ?? []).map((day) => (
                <button key={day.date} role="tab" aria-selected={selectedDate === day.date} className={`week-day ${selectedDate === day.date ? "is-active" : ""} ${day.date === todayISO ? "is-today" : ""}`} onClick={() => setSelectedDate(day.date)}>
                  <span>{dayName(day.date, true).replace(".", "")}</span><strong>{Number(day.date.slice(-2))}</strong>{day.date === todayISO && <i aria-label="Hoje" />}
                </button>
              ))}
            </div>
            {selectedReading && <ReadingCard reading={selectedReading} />}
            {selectedSky && <SkyDetail day={selectedSky} />}

            {selectedSky && (
              <div style={{ margin: "1.5rem 0", textAlign: "center" }}>
                <button
                  className="button button--secondary"
                  style={{ width: "100%", justifyContent: "center", gap: "0.5rem" }}
                  onClick={() => copyToClipboard(generateWeeklyPrompt(profile, selectedSky, shortRange), "week")}
                >
                  {copiedPromptType === "week" ? <Check size={17} /> : <Sparkles size={17} color="#f0c674" />}
                  {copiedPromptType === "week" ? "Prompt do Dia Copiado!" : "Gerar Prompt deste Dia para IA"}
                </button>
              </div>
            )}

            <section className="section-block week-explanation">
              <SectionHeading eyebrow="COMO LER" title="Um convite, não uma sentença" />
              <p>As posições e os ângulos são calculados no seu dispositivo. Os textos são regras simbólicas simples, não previsões garantidas. Quando não aparece um aspecto pessoal forte, preferimos dizer isso a inventar uma mensagem.</p>
              <p className="tiny-note">A Lua muda rapidamente. Com horário de nascimento desconhecido, ela fica de fora do cruzamento natal; o horário de referência dos demais planetas aparece como aproximado.</p>
            </section>
          </>
        )}

        {tab === "profile" && (
          <>
            <section className="page-intro">
              <span className="eyebrow">SEU ESPAÇO</span>
              <h1>Perfil e cuidado.</h1>
              <p>Seus dados pertencem a este navegador. Você pode levar uma cópia com você.</p>
            </section>
            <ProfileForm initialProfile={profile} onSave={handleSaveProfile} />
            <section className="section-block backup-section">
              <SectionHeading eyebrow="SEUS DADOS" title="Faça uma cópia" />
              <p>O backup inclui seu perfil e a última semana calculada. Guarde o arquivo em um local seguro; ele contém dados pessoais.</p>
              <div className="backup-actions">
                <button className="button button--secondary" onClick={() => { downloadBackup(profile, bundle); setSuccess("Backup exportado. Salve o arquivo em um local que você controle."); }}><Download size={17} /> Exportar backup</button>
                <label className="button button--secondary file-button"><Upload size={17} /> Restaurar backup<input type="file" accept="application/json,.json" onChange={(event) => void handleImport(event.target.files?.[0])} /></label>
              </div>
              <p className="backup-caution"><ShieldCheck size={15} /> Sem conta ou sincronização: ao limpar os dados do navegador ou trocar de aparelho, o perfil pode desaparecer. Recomendamos exportar uma cópia.</p>
            </section>
            <section className="delete-section">
              <div><strong>Apagar dados deste aparelho</strong><p>Remove o perfil e as leituras salvas. Um backup anterior não é afetado.</p></div>
              <button className="button button--danger" onClick={handleDeleteData}>Apagar</button>
            </section>
          </>
        )}

        <footer className="app-footer"><span>SEU CÉU</span><p>Astrologia simbólica para reflexão pessoal. Não substitui orientação profissional.</p></footer>
      </main>

      {hasTestAccess && (
        <nav className="bottom-nav" aria-label="Navegação principal">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${tab === id ? "is-active" : ""}`} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}>
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

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>;
}

function SignTile({ label, position, icon }: { label: string; position: { sign: string; degree: number } | null; icon: ReactNode }) {
  return <div className={`sign-tile ${position ? "" : "sign-tile--muted"}`}><span className="sign-tile__icon">{icon}</span><span className="sign-tile__label">{label}</span><strong>{position?.sign ?? "Sem dado"}</strong><small>{position ? `${position.degree.toFixed(1)}°` : "Horário desconhecido"}</small></div>;
}

function SkySummary({ days }: { days: DailyEphemeris[] }) {
  const retrograde = [...new Set(days.flatMap((day) => day.retrogrades))];
  const conjunctions = days.flatMap((day) => day.globalAspects.filter((aspect) => aspect.type === "conjunção"));
  return (
    <div className="sky-summary">
      <div className="sky-summary__row"><span className="sky-icon"><Orbit size={17} /></span><div><strong>Movimentos retrógrados detectados</strong><p>{retrograde.length ? retrograde.map((id) => PLANETS.find((p) => p.id === id)?.name).join(", ") : "Nenhum planeta retrógrado na semana calculada."}</p></div></div>
      <div className="sky-summary__row"><span className="sky-icon"><Sparkles size={17} /></span><div><strong>Conjunções mais próximas</strong><p>{conjunctions.length ? conjunctions.slice(0, 3).map((a) => `${PLANETS.find((p) => p.id === a.firstPlanet)?.name} + ${PLANETS.find((p) => p.id === a.secondPlanet)?.name}`).join(" · ") : "Nenhuma conjunção dentro do orbe usado nesta versão."}</p></div></div>
      <p className="tiny-note">As datas e aspectos são calculados no dispositivo. Um movimento retrógrado é uma aparência geocêntrica, não uma inversão física da órbita.</p>
    </div>
  );
}

function SkyDetail({ day }: { day: DailyEphemeris }) {
  const aspects = day.globalAspects.slice(0, 4);
  const retrogrades = day.retrogrades.map((id) => PLANETS.find((planet) => planet.id === id)?.name ?? id);
  return (
    <section className="sky-detail">
      <div className="sky-detail__header"><div><span className="eyebrow">CÉU COMPARTILHADO</span><h2>{dayName(day.date)} em movimento</h2></div><span className="sky-detail__date">{formatDateISO(day.date, { day: "numeric", month: "short" })}</span></div>
      <div className="event-list">
        {aspects.length ? aspects.map((aspect) => (
          <div className="event-row" key={`${aspect.firstPlanet}-${aspect.secondPlanet}-${aspect.type}`}><Sparkles size={15} /><span><strong>{PLANETS.find((p) => p.id === aspect.firstPlanet)?.name} {aspect.type} {PLANETS.find((p) => p.id === aspect.secondPlanet)?.name}</strong><small>Orbe calculated: {aspect.orb.toFixed(1)}°</small></span></div>
        )) : <p className="empty-note">Nenhum aspecto maior próximo segundo os orbes deste MVP.</p>}
      </div>
      <div className="retrograde-row"><RefreshCw size={15} /><span><strong>Retrógrados</strong><small>{retrogrades.length ? retrogrades.join(", ") : "Nenhum detectado hoje"}</small></span></div>
    </section>
  );
}

export default App;
