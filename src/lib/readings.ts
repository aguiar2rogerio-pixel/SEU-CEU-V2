import { findGlobalAspects, findPersonalAspects } from "./aspects";
import { PLANETS } from "./ephemeris";
import type { BirthProfile, DailyEphemeris, DailyReading, NatalChart, PlanetId, TransitAspect } from "./types";

const THEMES: Record<PlanetId, string> = {
  sun: "identidade, vitalidade e direção",
  moon: "necessidades emocionais e acolhimento",
  mercury: "conversas, ideias e escolhas",
  venus: "vínculos, valores e reciprocidade",
  mars: "iniciativa, energia e limites",
  jupiter: "crescimento, confiança e perspectiva",
  saturn: "responsabilidade, estrutura e compromisso",
  uranus: "mudanças, liberdade e novas possibilidades",
  neptune: "sensibilidade, imaginação e clareza",
  pluto: "transformação, intensidade e desapego",
};

const TRANSIT_VERBS: Record<PlanetId, string> = {
  sun: "ilumina", moon: "sensibiliza", mercury: "movimenta", venus: "aproxima", mars: "ativa",
  jupiter: "amplia", saturn: "estrutura", uranus: "renova", neptune: "inspira", pluto: "aprofunda",
};

const ASPECT_WORDS: Record<TransitAspect["type"], string> = {
  "conjunção": "conjunção",
  "sextil": "abertura",
  "quadratura": "ponto de tensão",
  "trígono": "fluxo favorável",
  "oposição": "necessidade de equilíbrio",
};

const ACTIONS: Record<TransitAspect["type"], string> = {
  "conjunção": "Observe onde sua atenção está concentrada e escolha uma ação pequena, feita com intenção.",
  "sextil": "Uma conversa ou oportunidade simples pode ajudar. Dê um passo possível sem tentar controlar tudo.",
  "quadratura": "Antes de reagir, faça uma pausa e separe o que é urgência do que realmente importa.",
  "trígono": "Aproveite a fluidez para avançar, mantendo os pés no chão e respeitando seus limites.",
  "oposição": "Procure escutar o outro lado e equilibrar necessidades que parecem disputar espaço.",
};

const ELEMENT_REFLECTION: Record<string, string> = {
  fogo: "Seu Sol em elemento Fogo sugere uma semana para direcionar a iniciativa com presença, sem confundir pressa com coragem.",
  terra: "Seu Sol em elemento Terra sugere uma semana para fortalecer um passo concreto e cuidar do que precisa de continuidade.",
  ar: "Seu Sol em elemento Ar sugere uma semana para organizar ideias, conversar com clareza e deixar espaço para novas perspectivas.",
  agua: "Seu Sol em elemento Água sugere uma semana para acolher o que sente sem tomar cada emoção como uma instrução imediata.",
};

const ELEMENT_BY_SIGN: Record<string, string> = {
  Áries: "fogo", Leão: "fogo", Sagitário: "fogo",
  Touro: "terra", Virgem: "terra", Capricórnio: "terra",
  Gêmeos: "ar", Libra: "ar", Aquário: "ar",
  Câncer: "agua", Escorpião: "agua", Peixes: "agua",
};

function nameOf(id: PlanetId): string {
  return PLANETS.find((planet) => planet.id === id)?.name ?? id;
}

function topicOf(id: PlanetId): string {
  return THEMES[id];
}

function aspectLine(aspect: TransitAspect): string {
  const transitName = nameOf(aspect.transitPlanet);
  const natalName = nameOf(aspect.natalPlanet);
  return `Na leitura simbólica, ${transitName} em ${ASPECT_WORDS[aspect.type]} com seu ${natalName} coloca ${topicOf(aspect.natalPlanet)} em evidência.`;
}

function careerAdvice(aspect: TransitAspect | undefined, profile: BirthProfile, natal: NatalChart): string {
  if (aspect) {
    const planet = nameOf(aspect.transitPlanet);
    const natalPoint = nameOf(aspect.natalPlanet);
    if (["mercury", "mars", "jupiter", "saturn"].includes(aspect.transitPlanet)) {
      return `${planet} toca seu ${natalPoint}: revise prioridades, alinhe expectativas e transforme uma ideia em um próximo passo possível.`;
    }
    return `Use o tema de ${planet} com seu ${natalPoint} para rever o que merece energia e quais compromissos podem esperar.`;
  }
  const sunSign = natal.sun?.sign;
  const element = sunSign ? ELEMENT_BY_SIGN[sunSign] : "ar";
  return `${profile.name.split(" ")[0]}, escolha uma prioridade concreta para a semana e deixe espaço para ajustar o plano conforme a realidade.` +
    (element ? ` Seu Sol em ${sunSign ?? "signo não calculado"} é usado apenas como ponto de reflexão.` : "");
}

function relationshipAdvice(aspect: TransitAspect | undefined): string {
  if (aspect) {
    const natalName = nameOf(aspect.natalPlanet);
    const verb = TRANSIT_VERBS[aspect.transitPlanet];
    return `${nameOf(aspect.transitPlanet)} ${verb} o tema do seu ${natalName}; pratique escuta e diga com gentileza o que você precisa.`;
  }
  return "Uma pergunta feita com curiosidade pode aproximar mais do que uma resposta preparada. Reserve tempo para ouvir.";
}

export function createWeeklyReadings(
  profile: BirthProfile,
  natal: NatalChart,
  days: DailyEphemeris[],
): DailyReading[] {
  const aspects = findPersonalAspects(days, natal);
  const firstName = profile.name.trim().split(/\s+/)[0] || "Você";
  const sunSign = natal.sun?.sign;
  const element = sunSign ? ELEMENT_BY_SIGN[sunSign] : "ar";

  return days.map((day, index) => {
    const dailyAspects = aspects
      .filter((aspect) => aspect.date === day.date)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const main = dailyAspects[0];
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" })
      .format(new Date(`${day.date}T12:00:00.000Z`));
    const title = main
      ? `${nameOf(main.transitPlanet)} em foco no seu ${nameOf(main.natalPlanet)}`
      : index === 0 ? "Comece pelo que faz sentido para você" : "Um dia para observar o próprio ritmo";
    const summary = main
      ? `${firstName}, ${aspectLine(main)}`
      : `${firstName}, nesta ${weekday}, não encontramos um aspecto pessoal maior nas regras desta versão. ${ELEMENT_REFLECTION[element]}`;
    const action = main
      ? ACTIONS[main.type]
      : "Use esta orientação como convite à reflexão, não como previsão. Escolha uma atitude que esteja sob seu controle.";
    const career = careerAdvice(main, profile, natal);
    const relationships = relationshipAdvice(main);

    return {
      date: day.date,
      title,
      summary,
      action,
      career,
      relationships,
      aspects: dailyAspects,
      basis: main ? "aspecto-pessoal" : "reflexao-geral",
    };
  });
}

export function weeklyLead(natal: NatalChart, days: DailyEphemeris[]): string {
  const mostPreciseGlobal = days
    .flatMap((day) => findGlobalAspects(day))
    .sort((a, b) => a.orb - b.orb)[0];
  if (mostPreciseGlobal) {
    return `Um aspecto entre ${nameOf(mostPreciseGlobal.firstPlanet)} e ${nameOf(mostPreciseGlobal.secondPlanet)} aparece com destaque no céu da semana. Veja em quais dias e como esse movimento conversa com o seu mapa.`;
  }
  const sign = natal.sun?.sign;
  return sign
    ? `A leitura parte do seu Sol em ${sign} e acompanha os movimentos planetários desta semana, sem transformar tendências em certezas.`
    : "A semana está pronta para ser observada com calma. As posições são calculadas no seu aparelho.";
}

export function getReadingBasisLabel(reading: DailyReading): string {
  return reading.basis === "aspecto-pessoal" ? "Cruzamento com seu mapa" : "Reflexão a partir do seu Sol";
}
