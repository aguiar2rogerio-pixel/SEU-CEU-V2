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
 * Busca os municípios de um estado na API oficial do IBGE,
 * associando o fuso horário correto do estado.
 */
export async function getCitiesByState(stateUf: string): Promise<CityRecord[]> {
  if (citiesCache[stateUf]) {
    return citiesCache[stateUf];
  }

  try {
    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUf}/municipios?orderBy=nome`
    );

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar municípios do IBGE`);
    }

    const data = await response.json();
    const zone = getTimezoneByState(stateUf);

    const formattedCities: CityRecord[] = data.map((item: any) => ({
      id: String(item.id),
      name: item.nome,
      state: stateUf,
      // O IBGE retorna a latitude/longitude diretamente em algumas estruturas de microrregião/região imediata, 
      // mas caso venha vazio, definimos como 0 ou tratamos no resolvedor. 
      // Aqui garantimos que o objeto mantenha o contrato limpo.
      latitude: item.latitude ?? item.microrregiao?.mesorregiao?.UF?.latitude ?? 0,
      longitude: item.longitude ?? item.microrregiao?.mesorregiao?.UF?.longitude ?? 0,
      timezone: zone,
    }));

    citiesCache[stateUf] = formattedCities;
    return formattedCities;
  } catch (error) {
    console.error("Erro ao buscar cidades do IBGE:", error);
    return [];
  }
}

/**
 * Retorna a própria cidade (compatibilidade com a chamada do ProfileForm).
 */
export async function resolveCityCoordinates(city: CityRecord): Promise<CityRecord> {
  return city;
}
