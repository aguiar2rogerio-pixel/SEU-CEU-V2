import type { BirthProfile, DailyEphemeris, NatalChart } from "./types";
import { PLANETS, planetName } from "./ephemeris";
import { formatDegrees } from "./formatters";

// Generates a complete prompt for a Natal Chart reading
export function generateNatalPrompt(profile: BirthProfile, natal: NatalChart | null): string {
  if (!natal) return "";

  const planetsList = PLANETS.map((p) => {
    const pos = natal[p.id];
    return pos ? `- ${p.name}: ${pos.sign} (${formatDegrees(pos.degree)})` : null;
  })
    .filter(Boolean)
    .join("\n");

  const ascendantInfo = natal.ascendant
    ? `- Ascendente: ${natal.ascendant.sign} (${formatDegrees(natal.ascendant.degree)})`
    : "- Ascendente: Não disponível (horário de nascimento não informado)";

  return `Atue como um astrólogo experiente, acolhedor e focado em autoconhecimento prático. 

Analise o seguinte Mapa Astral calculado com precisão astronômica:

Nome: ${profile.name}
Data de Nascimento: ${profile.birthDate}
Horário: ${profile.birthTime || "Não informado"}
Local: ${profile.birthPlace || "Não informado"}

POSIÇÕES ASTROLÓGICAS:
${ascendantInfo}
${planetsList}

POR FAVOR, FORNEÇA UMA ANÁLISE DIVIDIDA NAS SEGUINTES SEÇÕES:
1. Essência e Propósito (Sol)
2. Mundo Emocional e Necessidades Internas (Lua)
3. Como se Apresenta ao Mundo e Primeira Impressão (Ascendente)
4. Mente, Comunicação e Relacionamentos (Mercúrio, Vênus e Marte)
5. Síntese e Conselho Prático para Evolução Pessoal

REGRAS RIGOROSAS DE FORMATAÇÃO:
- Responda APENAS em texto Markdown limpo e formatado.
- NÃO inclua imagens, links, URLs ou markdown de mídia (![imagem](...)).
- Mantenha o tom acolhedor, objetivo e focado em desenvolvimento pessoal.`;
}

// Generates a prompt for a Weekly Transit reading
export function generateWeeklyPrompt(
  profile: BirthProfile,
  selectedDay: DailyEphemeris,
  weekRange: string
): string {
  const aspectsList = selectedDay.globalAspects.length
    ? selectedDay.globalAspects
        .slice(0, 4)
        .map((a) => {
          const p1 = planetName(a.firstPlanet);
          const p2 = planetName(a.secondPlanet);
          return `- ${p1} em ${a.type} com ${p2} (Orbe: ${formatDegrees(a.orb)})`;
        })
        .join("\n")
    : "- Nenhum aspecto maior de destaque hoje.";

  const retrogrades = selectedDay.retrogrades.length
    ? selectedDay.retrogrades
        .map((id) => planetName(id))
        .join(", ")
    : "Nenhum no momento.";

  return `Atue como um astrólogo e mentor pessoal de autoconhecimento.

Analise o panorama astrológico do dia ${selectedDay.date} (Semana: ${weekRange}) para ${profile.name}:

TRÂNSITOS E MOVIMENTOS DO CÉU:
${aspectsList}
- Planetas Retrógrados Ativos: ${retrogrades}

POR FAVOR, FORNEÇA:
1. A energia principal deste dia e como ela impacta o foco mental e emocional.
2. Orientações práticas para o Trabalho, Decisões e Relações Pessoais.
3. Uma frase de intenção/atenção curta para guiar o dia.

REGRAS RIGOROSAS DE FORMATAÇÃO:
- Responda APENAS em texto Markdown limpo e formatado.
- NÃO inclua imagens, links, URLs ou markdown de mídia (![imagem](...)).`;
}

export function generateCurrentPrompt(profile: BirthProfile, natal: NatalChart | null, bundle: { days: DailyEphemeris[] } | null): string {
  if (!natal || !bundle) return "";
  const firstDays = bundle.days.slice(0, 7).map((day) => {
    const aspects = day.globalAspects.slice(0, 3).map((aspect) => `${planetName(aspect.firstPlanet)} ${aspect.type} ${planetName(aspect.secondPlanet)}`).join(", ") || "sem aspecto maior";
    return `- ${day.date}: ${aspects}; retrógrados: ${day.retrogrades.map(planetName).join(", ") || "nenhum"}`;
  }).join("\n");
  return `Atue como um astrólogo acolhedor e lúcido. Faça uma leitura do momento atual de ${profile.name}, relacionando o mapa natal abaixo com os trânsitos calculados para os próximos dias.\n\nMAPA NATAL:\n${generateNatalPrompt(profile, natal)}\n\nTRÂNSITOS CALCULADOS:\n${firstDays}\n\nOrganize em: tema central do momento, oportunidades, pontos de atenção, relações, trabalho e uma prática simples para a semana. Não invente posições nem faça previsões deterministas. Responda em Markdown limpo, sem links ou imagens.`;
}

export function generateYearlyPrompt(profile: BirthProfile, natal: NatalChart | null): string {
  if (!natal) return "";
  return `Atue como um astrólogo experiente, acolhedor e responsável. Crie uma leitura anual personalizada para ${profile.name} sobre 2027 usando exclusivamente o mapa natal abaixo.\n\n${generateNatalPrompt(profile, natal)}\n\nOrganize a leitura por: visão geral do ano, identidade e desenvolvimento, trabalho e vocação, relações, bem-estar e quatro períodos do ano (janeiro–março, abril–junho, julho–setembro, outubro–dezembro). Use linguagem simbólica, indique tendências como possibilidades e ofereça perguntas práticas de reflexão. Não invente trânsitos específicos que não foram fornecidos, não prometa acontecimentos e responda em Markdown limpo, sem links ou imagens.`;
}
