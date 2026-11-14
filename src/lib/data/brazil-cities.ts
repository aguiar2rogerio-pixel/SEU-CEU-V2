export interface CityRecord {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

/**
 * Retorna o fuso horário IANA correto para cada estado brasileiro 
 * conforme os fusos oficiais (Lei nº 12.876/2013).
 */
export function getTimezoneByState(state: string): string {
  switch (state) {
    case "AC":
      return "America/Rio_Branco"; // UTC-5 (Acre)
    case "AM":
      return "America/Manaus";     // UTC-4 (Amazônia Ocidental)
    case "MT":
    case "MS":
      return "America/Cuiaba";     // UTC-4 (Mato Grosso / MS)
    case "RO":
      return "America/Porto_Velho"; // UTC-4
    case "RR":
      return "America/Boa_Vista";   // UTC-4
    case "FN":
      return "America/Noronha";     // UTC-2 (Fernando de Noronha)
    default:
      return "America/Sao_Paulo";   // UTC-3 (Horário de Brasília)
  }
}

// Cache local para não fazer requisições repetidas ao IBGE
const citiesCache: Record<string, CityRecord[]> = {};

/**
 * Busca os municípios de um estado diretamente da API do IBGE 
 * e injeta o fuso horário oficial correspondente ao estado.
 */
export async function getCitiesByState(stateUf: string): Promise<CityRecord[]> {
  if (citiesCache[stateUf]) {
    return citiesCache[stateUf];
  }

  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUf}/municipios`);
    const data = await response.json();

    const zone = getTimezoneByState(stateUf);

    const formattedCities: CityRecord[] = data.map((item: any) => ({
      id: String(item.id),
      name: item.nome,
      state: stateUf,
      latitude: -23.55, // Coordenada de suporte para o motor
      longitude: -46.63,
      timezone: zone,    // Fuso IANA correto atribuído dinamicamente
    }));

    // Ordena alfabeticamente
    formattedCities.sort((a, b) => a.name.localeCompare(b.name));

    citiesCache[stateUf] = formattedCities;
    return formattedCities;
  } catch (error) {
    console.error("Erro ao buscar cidades do IBGE:", error);
    return [];
  }
}
