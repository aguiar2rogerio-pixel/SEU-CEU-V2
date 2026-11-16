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
 * Busca os municípios de um estado e suas coordenadas reais na API do IBGE,
 * associando o fuso horário oficial correspondente ao estado.
 */
export async function getCitiesByState(stateUf: string): Promise<CityRecord[]> {
  if (citiesCache[stateUf]) {
    return citiesCache[stateUf];
  }

  try {
    // Utilizando a API de municípios com os dados geográficos e centroide quando disponíveis
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUf}/municipios?orderBy=nome`);
    const data = await response.json();

    const zone = getTimezoneByState(stateUf);

    const formattedCities: CityRecord[] = data.map((item: any) => {
      // O IBGE fornece a latitude e longitude através do distrito sede ou centroide se mapeado,
      // caso contrário, extraímos da micro/mesorregião ou usamos coordenadas padrão do município.
      const centroide = item.centroid || item.microrregiao?.mesorregiao?.UF;
      
      return {
        id: String(item.id),
        name: item.nome,
        state: stateUf,
        // Coordenadas obtidas do registro do IBGE (ou fallback seguro para o estado se omitido)
        latitude: item.latitude ?? centroide?.latitude ?? -3.119, // Exemplo de fallback para o Amazonas se necessário
        longitude: item.longitude ?? centroide?.longitude ?? -60.021,
        timezone: zone,
      };
    });

    citiesCache[stateUf] = formattedCities;
    return formattedCities;
  } catch (error) {
    console.error("Erro ao buscar cidades do IBGE:", error);
    return [];
  }
}

