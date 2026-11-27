import { X } from "lucide-react";
import { MapPage, type MapPanelId } from "./MapPage";
import { RadarPage } from "./RadarPage";
import { ReadingExperiencePage, type ReadingExperienceId } from "./ReadingExperiencePage";
import type { BirthProfile, NatalMapRecord } from "../lib/types";

type ReadingProps = React.ComponentProps<typeof ReadingExperiencePage>;

type Props = {
  map: NatalMapRecord;
  birthTimeLabel: string;
  openPanels: MapPanelId[];
  radarOpen: boolean;
  readingProps: ReadingProps | null;
  onTogglePanel: (panel: MapPanelId) => void;
  onOpenRadar: () => void;
  onOpenExperience: (experience: ReadingExperienceId) => void;
  onClose: () => void;
};

export function HistoricalMapModal({ map, birthTimeLabel, openPanels, radarOpen, readingProps, onTogglePanel, onOpenRadar, onOpenExperience, onClose }: Props) {
  const profile = map.profile as BirthProfile;

  return (
    <div className="history-modal-backdrop" role="presentation">
      <section className="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
        <header className="history-modal__header">
          <div>
            <span className="eyebrow">LEITURA HISTÓRICA</span>
            <h2 id="history-modal-title">Mapa de {profile.name}</h2>
            <p>Mapa de terceiro · não altera o mapa pessoal, Hoje ou Semana.</p>
          </div>
          <button className="icon-button history-modal__close" type="button" onClick={onClose} aria-label="Fechar e voltar para Leituras e Segurança" title="Fechar">
            <X size={20} />
          </button>
        </header>
        <div className="history-modal__body">
          {readingProps ? <ReadingExperiencePage {...readingProps} /> : radarOpen ? <RadarPage natal={map.natal} onBack={onClose} /> : <MapPage profile={profile} natal={map.natal} isPrimary={false} isHistorical birthTimeLabel={birthTimeLabel} openPanels={openPanels} onTogglePanel={onTogglePanel} onOpenRadar={onOpenRadar} onOpenExperience={onOpenExperience} />}
        </div>
      </section>
    </div>
  );
}
