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
const coordinatesCache: Record<string, { latitude: number; longitude: number }> = {};

/**
 * Busca os municípios de um estado na API de Localidades do IBGE,
 * associando o fuso horário oficial correspondente ao estado.
 */
export async function getCitiesByState(stateUf: string): Promise<CityRecord[]> {
  if (citiesCache[stateUf]) {
    return citiesCache[stateUf];
  }

  try {
    const response = await fetch(
      `https://ibge.gov.br{stateUf}/municipios?orderBy=nome`
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
      // Preenchido sob demanda ao selecionar a cidade, evitando fallback falso
      latitude: Number.NaN,
      longitude: Number.NaN,
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
 * Consulta o centroide oficial do município na API de Malhas Geográficas do IBGE
 * utilizando o código IBGE de 7 dígitos, com cache em memória e sem fallback silencioso.
 */
export async function resolveCityCoordinates(city: CityRecord): Promise<CityRecord> {
  if (Number.isFinite(city.latitude) && Number.isFinite(city.longitude)) {
    return city;
  }

  if (coordinatesCache[city.id]) {
    return {
      ...city,
      ...coordinatesCache[city.id],
    };
  }

  const response = await fetch(
    `https://ibge.gov.br{city.id}/metadados`
  );

  if (!response.ok) {
    throw new Error(
      `Não foi possível consultar as coordenadas de ${city.name}/${city.state} no IBGE (HTTP ${response.status}).`
    );
  }

  const data = await response.json();
  const centroide = Array.isArray(data) ? data[0]?.centroide : data?.centroide;

  if (
    !centroide ||
    typeof centroide.latitude !== "number" ||
    typeof centroide.longitude !== "number" ||
    !Number.isFinite(centroide.latitude) ||
    !Number.isFinite(centroide.longitude)
  ) {
    throw new Error(
      `Coordenadas geográficas indisponíveis para ${city.name}/${city.state} no retorno do IBGE.`
    );
  }

  const coords = {
    latitude: centroide.latitude,
    longitude: centroide.longitude,
  };

  coordinatesCache[city.id] = coords;

  return {
    ...city,
    ...coords,
  };
}
