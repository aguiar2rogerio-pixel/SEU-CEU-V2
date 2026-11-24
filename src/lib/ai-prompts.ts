import type { BirthProfile, DailyEphemeris, NatalChart } from "./types";
import { PLANETS, planetName } from "./ephemeris";
import { findAspect } from "./aspects";
import { getMoonPhaseInfo } from "./moon-phases";
import { findHouseForLongitude } from "./houses/placidus";
import { formatDegrees } from "./formatters";

const ANGLE_LABELS = [
  ["ascendant", "Ascendente"],
  ["descendant", "Descendente"],
  ["midheaven", "Meio do Céu"],
  ["imumCoeli", "Fundo do Céu"],
] as const;

const COMPLEMENTARY_LABELS = [
  ["northNode", "Nodo Norte"],
  ["southNode", "Nodo Sul"],
  ["lilith", "Lilith"],
  ["chiron", "Quíron"],
  ["partOfFortune", "Parte da Fortuna"],
  ["vertex", "Vértice"],
] as const;

function natalHouse(natal: NatalChart, longitude: number): number | null {
  const houses = natal.houses;
  if (!houses || houses.status === "unavailable" || houses.cusps.length !== 12) return null;
  return findHouseForLongitude(longitude, houses.cusps);
}

function generateNatalAspects(natal: NatalChart): string {
  const aspects: { first: string; second: string; type: string; orb: number }[] = [];
  for (let firstIndex = 0; firstIndex < PLANETS.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < PLANETS.length; secondIndex += 1) {
      const firstPlanet = PLANETS[firstIndex];
      const secondPlanet = PLANETS[secondIndex];
      const first = natal[firstPlanet.id];
      const second = natal[secondPlanet.id];
      if (!first || !second) continue;
      const aspect = findAspect(first.longitude, second.longitude);
      if (aspect) {
        aspects.push({
          first: firstPlanet.name,
          second: secondPlanet.name,
          type: aspect.type,
          orb: aspect.orb,
        });
      }
    }
  }

  return aspects
    .sort((first, second) => first.orb - second.orb)
    .slice(0, 12)
    .map((aspect) => `- ${aspect.first} em ${aspect.type} com ${aspect.second} (orbe: ${formatDegrees(aspect.orb)})`)
    .join("\n") || "- Nenhum aspecto natal principal disponível.";
}

function generateNatalData(profile: BirthProfile, natal: NatalChart): string {
  const planetsList = PLANETS.map((planet) => {
    const position = natal[planet.id];
    if (!position) return null;
    const house = natalHouse(natal, position.longitude);
    const houseInfo = house ? ` — Casa ${house}` : "";
    return `- ${planet.name}: ${position.sign} (${formatDegrees(position.degree)})${houseInfo}`;
  })
    .filter(Boolean)
    .join("\n");

  const anglesList = ANGLE_LABELS.map(([id, label]) => {
    const position = natal.angles?.[id];
    if (!position) return null;
    return `- ${label}: ${position.sign} (${formatDegrees(position.degree)})`;
  })
    .filter(Boolean)
    .join("\n") || "- Ângulos não disponíveis.";

  const complementaryList = COMPLEMENTARY_LABELS.map(([id, label]) => {
    const point = natal.complementaryPoints?.[id];
    if (!point?.sign || point.status === "unavailable") return null;
    const degree = point.degree === null ? "" : ` (${formatDegrees(point.degree)})`;
    const house = point.house ? ` — Casa ${point.house}` : "";
    return `- ${label}: ${point.sign}${degree}${house}`;
  })
    .filter(Boolean)
    .join("\n");

  return `Nome: ${profile.name}
Data de Nascimento: ${profile.birthDate}
Horário: ${profile.birthTime || "Não informado"}
Local: ${profile.birthPlace || "Não informado"}

POSIÇÕES DOS PLANETAS POR SIGNO E CASA:
${planetsList}

ÂNGULOS DO MAPA:
${anglesList}

PRINCIPAIS ASPECTOS NATAIS CALCULADOS:
${generateNatalAspects(natal)}

	PONTOS COMPLEMENTARES DISPONÍVEIS:
${complementaryList || "- Nenhum ponto complementar disponível."}`;
}

function generateNatalHouses(natal: NatalChart): string {
  const houses = natal.houses;
  if (!houses || houses.status === "unavailable" || houses.cusps.length !== 12) {
    return "- Casas astrológicas não disponíveis.";
  }

  return houses.cusps
    .map((cusp) => `- Casa ${cusp.house}: ${cusp.sign} (${formatDegrees(cusp.degree)})`)
    .join("\n");
}

// Generates a complete prompt for a Natal Chart reading
export function generateNatalPrompt(profile: BirthProfile, natal: NatalChart | null): string {
  if (!natal) return "";

  return `Atue como um astrólogo experiente, acolhedor e focado em autoconhecimento prático.

Analise o seguinte mapa natal de ${profile.name}, calculado com precisão astronômica:

${generateNatalData(profile, natal)}

Organize a leitura nas seguintes seções, sem criar seções alternativas ou repetir a mesma análise:
1. Essência e propósito, integrando o Sol, sua casa e os aspectos relevantes.
2. Mundo emocional e necessidades internas, integrando a Lua, sua casa e os aspectos relevantes.
3. Como a pessoa se apresenta ao mundo e sua primeira impressão, considerando o Ascendente, o Descendente e os demais ângulos quando contribuírem para a leitura.
4. Mente, comunicação, afetos e iniciativa, integrando Mercúrio, Vênus e Marte com suas casas e aspectos.
5. Síntese do mapa e conselho prático para evolução pessoal, destacando padrões que se repetem entre signos, casas e aspectos.

Use os pontos complementares apenas quando ajudarem a aprofundar um padrão já identificado. Não trate esses pontos como o centro da leitura. Não descreva cada posição de forma isolada: priorize relações, convergências e tensões significativas entre os dados fornecidos. Não invente informações que não estejam nos dados.

REGRAS RIGOROSAS DE FORMATAÇÃO:
- Responda APENAS em texto Markdown limpo e formatado.
- NÃO inclua imagens, links, URLs ou markdown de mídia (![imagem](...)).
- Mantenha o tom acolhedor, objetivo e focado em desenvolvimento pessoal.`;
}

export function generateDepthPrompt(profile: BirthProfile, natal: NatalChart | null, question: string): string {
  if (!natal || !question.trim()) return "";

  return `PAPEL

Você é um astrólogo experiente, com abordagem acolhedora, cuidadosa e voltada ao autoconhecimento prático.

Sua tarefa é aprofundar um assunto específico da vida da pessoa a partir do conjunto de informações do seu mapa natal.

OBJETIVO DA LEITURA

A pessoa deseja compreender melhor o seguinte assunto ou questão:

${question.trim()}

Analise o mapa natal fornecido e selecione os indicadores astrológicos que realmente contribuam para compreender essa questão.

Você receberá os dados completos do mapa natal. Isso não significa que deva interpretar todas as posições. Selecione e integre apenas os elementos pertinentes ao assunto.

Considere, quando contribuírem para a análise:

- Planetas e seus posicionamentos por signo e casa.
- Ascendente, Meio do Céu e demais ângulos.
- Regências e relações entre casas, quando estiverem disponíveis nos dados.
- Aspectos planetários e suas configurações.
- Pontos complementares disponíveis.

Não reduza a interpretação a um único planeta, signo ou casa. Considere o conjunto do mapa e as relações entre seus elementos.

Não utilize correspondências rígidas ou fórmulas automáticas para cada assunto. Analise os indicadores em conjunto, respeitando as particularidades da pergunta.

ESTRUTURA DA RESPOSTA

Organize a interpretação em quatro eixos:

1. O que seu mapa revela sobre esse assunto

Apresente uma interpretação integrada dos indicadores mais relevantes, explicando como eles se relacionam com a questão apresentada.

2. Seus potenciais

Identifique recursos, talentos, facilidades e possibilidades que podem ser desenvolvidos nesse campo.

3. Seus desafios

Apresente tensões, dificuldades ou padrões que mereçam atenção, sem transformar tendências astrológicas em limitações ou certezas.

4. Caminhos de desenvolvimento

Ofereça reflexões e possibilidades práticas de autoconhecimento, considerando o que foi identificado no mapa.

ORIENTAÇÕES IMPORTANTES

- Responda especificamente à pergunta apresentada.
- Não produza uma nova leitura natal completa.
- Não repita conteúdos genéricos que poderiam servir para qualquer pessoa.
- Não descreva posições isoladamente. Integre os indicadores relevantes.
- Não invente posições, aspectos, casas, regências ou informações ausentes.
- Se algum dado necessário não estiver disponível, reconheça essa limitação.
- Não force interpretações quando determinado indicador não contribuir para a questão.
- Utilize linguagem natural, clara, acolhedora e aprofundada.
- Evite determinismo, previsões categóricas e afirmações absolutas.
- Não transforme interpretações astrológicas em diagnósticos ou orientações médicas, psicológicas, jurídicas, profissionais ou financeiras.
- Não apresente os quatro eixos como tópicos artificiais quando algum deles não tiver conteúdo relevante. Preserve a naturalidade e a coerência da interpretação.

A resposta deve ser específica, consistente e focada no tema escolhido pela pessoa.

DADOS DO MAPA NATAL

${generateNatalData(profile, natal)}

CASAS ASTROLÓGICAS

${generateNatalHouses(natal)}

RELAÇÕES ENTRE CASAS E REGÊNCIAS

Os dados de planetas por casa, ângulos e cúspides acima são as relações disponibilizadas pelo aplicativo. Não há uma tabela de regências explícitas neste cálculo; não invente regências que não estejam nos dados.

---`;
}

// Generates a prompt for a Weekly Transit reading
export function generateWeeklyPrompt(
  profile: BirthProfile,
  natal: NatalChart,
  selectedDay: DailyEphemeris,
  weekRange: string
): string {
  const moon = getMoonPhaseInfo(selectedDay);
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

Analise o panorama astrológico do dia ${selectedDay.date} (Semana: ${weekRange}) para ${profile.name}.

DADOS DO USUÁRIO E MAPA NATAL:
${generateNatalData(profile, natal)}

CONTEXTO LUNAR:
- Fase: ${moon.name}
- Signo da Lua: ${moon.sign}
- Lunação: ${moon.lunationLabel}

TRÂNSITOS E MOVIMENTOS DO CÉU:
${aspectsList}
- Planetas Retrógrados Ativos: ${retrogrades}

POR FAVOR, FORNEÇA:
1. A energia principal deste dia e como ela impacta o foco mental e emocional.
2. Orientações práticas para o Trabalho, Decisões e Relações Pessoais.
3. Uma frase de intenção/atenção curta para guiar o dia.

Considere a fase lunar, o signo da Lua e a lunação como contexto simbólico geral. Não invente posições, aspectos ou acontecimentos e não faça previsões deterministas.

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

  return `Atue como um astrólogo acolhedor e lúcido. Faça uma leitura do momento atual de ${profile.name}, relacionando o mapa natal e os trânsitos calculados para os próximos dias.

MAPA NATAL:
${generateNatalData(profile, natal)}

TRÂNSITOS CALCULADOS PARA OS PRÓXIMOS DIAS:
${firstDays}

Organize a leitura nas seguintes seções, sem repetir a mesma análise:
1. Tema central do momento, relacionando os trânsitos fornecidos aos padrões natais mais relevantes.
2. Oportunidades e possibilidades de desenvolvimento.
3. Pontos de atenção e cuidados práticos.
4. Relações.
5. Trabalho e decisões.
6. Uma prática simples para a semana.

Use as casas e os ângulos natais para contextualizar os temas quando houver base nos dados. Dê prioridade aos trânsitos e aspectos calculados para o período, sem transformar os aspectos natais em previsões atuais. Não invente posições ou aspectos que não foram fornecidos e não faça previsões deterministas.

REGRAS RIGOROSAS DE FORMATAÇÃO:
- Responda APENAS em texto Markdown limpo e formatado.
- NÃO inclua imagens, links, URLs ou markdown de mídia (![imagem](...)).`;
}
