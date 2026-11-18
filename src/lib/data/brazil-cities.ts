
export interface CityRecord {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface MunicipalityData {
  codigo_ibge: number;
  nome: string;
  latitude: number;
  longitude: number;
  fuso_horario: string;
}

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SE", "SP", "TO"
];

// Mantemos a lógica de fuso horário já testada.
export function getTimezoneByState(state: string): string {
  switch (state) {
    case "AC":
      return "America/Rio_Branco";
    case "AM":
      return "America/Manaus";
    case "MT":
    case "MS":
      return "America/Cuiaba";
    case "RO":
      return "America/Porto_Velho";
    case "RR":
      return "America/Boa_Vista";
    case "FN":
      return "America/Noronha";
    default:
      return "America/Sao_Paulo";
  }
}

const citiesCache: Record<string, CityRecord[]> = {};

let municipalityMapPromise: Promise<Map<string, MunicipalityData>> | null = null;

async function getMunicipalityMap(): Promise<Map<string, MunicipalityData>> {
  if (!municipalityMapPromise) {
    municipalityMapPromise = fetch(
      `${import.meta.env.BASE_URL}data/municipios.json`
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar a base de coordenadas.");
        }

        const data: MunicipalityData[] = await response.json();

        const map = new Map<string, MunicipalityData>();

        for (const item of data) {
          const id = String(item.codigo_ibge);

          if (
            Number.isFinite(item.latitude) &&
            Number.isFinite(item.longitude)
          ) {
            map.set(id, item);
          }
        }

        return map;
      })
      .catch((error) => {
        municipalityMapPromise = null;
        throw error;
      });
  }

  return municipalityMapPromise;
}

export async function getCitiesByState(
  stateUf: string
): Promise<CityRecord[]> {
  if (citiesCache[stateUf]) {
    return citiesCache[stateUf];
  }

  try {
    const [response, municipalityMap] = await Promise.all([
      fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUf}/municipios?orderBy=nome`
      ),
      getMunicipalityMap(),
    ]);

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar municípios.`);
    }

    const data = await response.json();

    const formattedCities: CityRecord[] = data.map((item: any) => {
      const municipality = municipalityMap.get(String(item.id));

      if (!municipality) {
        throw new Error(
          `Coordenadas não encontradas para ${item.nome} (${item.id}).`
        );
      }

      return {
        id: String(item.id),
        name: item.nome,
        state: stateUf,
        latitude: municipality.latitude,
        longitude: municipality.longitude,
        timezone: getTimezoneByState(stateUf),
      };
    });

    citiesCache[stateUf] = formattedCities;

    return formattedCities;
  } catch (error) {
    console.error("Erro ao buscar cidades e coordenadas:", error);
    return [];
  }
}

export async function resolveCityCoordinates(
  city: CityRecord
): Promise<CityRecord> {
  if (
    !Number.isFinite(city.latitude) ||
    !Number.isFinite(city.longitude)
  ) {
    throw new Error("As coordenadas deste município são inválidas.");
  }

  return city;
}
