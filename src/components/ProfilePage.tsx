import { useState } from "react";
import { Download, Edit3, Map, Plus, ShieldCheck, Star, Trash2, Upload } from "lucide-react";
import { ProfileForm } from "./ProfileForm";
import { SectionHeading } from "./SectionHeading";
import type { BirthProfile, NatalMapRecord } from "../lib/types";

type Props = {
  maps: NatalMapRecord[];
  primaryMapId: string | null;
  selectedMapId: string | null;
  onSelectMap: (id: string) => void;
  onSaveMap: (profile: BirthProfile, mapId: string | null) => void;
  onMakePrimary: (id: string) => void;
  onDeleteMap: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => void;
  onDeleteData: () => void;
};

export function ProfilePage({ maps, primaryMapId, selectedMapId, onSelectMap, onSaveMap, onMakePrimary, onDeleteMap, onExportBackup, onImportBackup, onDeleteData }: Props) {
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const editingMap = editingMapId ? maps.find((map) => map.id === editingMapId) ?? null : null;
  const formOpen = adding || Boolean(editingMap);

  function closeForm() {
    setAdding(false);
    setEditingMapId(null);
  }

  return (
    <>
      <section className="page-intro">
        <span className="eyebrow">SEU ESPAÇO</span>
        <h1>Suas leituras.</h1>
        <p>Organize mapas natais de pessoas diferentes neste aparelho. O mapa principal alimenta Hoje, Meu Mapa e Semana.</p>
      </section>

      <section className="section-block readings-maps-section" aria-label="Mapas salvos">
        <div className="section-heading-row"><SectionHeading eyebrow="MAPAS SALVOS" title="Escolha uma leitura" /><button className="button button--primary" type="button" onClick={() => { setEditingMapId(null); setAdding(true); }}><Plus size={16} /> Adicionar mapa</button></div>
        {maps.length === 0 ? <div className="map-empty-state"><Map size={19} /><p>Você ainda não tem um mapa salvo. Adicione um mapa para começar.</p></div> : <div className="saved-map-list">
          {maps.map((map) => {
            const isPrimary = map.id === primaryMapId;
            const isSelected = map.id === selectedMapId;
            const hasReading = Boolean(map.readings.natal);
            return <article className={`saved-map-card${isSelected ? " saved-map-card--selected" : ""}`} key={map.id}>
              <button className="saved-map-card__main" type="button" onClick={() => onSelectMap(map.id)}><span className="saved-map-card__icon"><Map size={19} /></span><span className="saved-map-card__copy"><strong>{map.profile.name}</strong><small>{isPrimary ? "Mapa principal · alimenta Hoje e Semana" : "Mapa adicional · somente consulta natal"}</small>{hasReading && <em>Interpretação natal salva</em>}</span>{isPrimary && <span className="saved-map-card__primary"><Star size={13} fill="currentColor" /> Principal</span>}</button>
              <div className="saved-map-card__actions"><button className="text-link" type="button" onClick={() => onSelectMap(map.id)}>Consultar</button><button className="text-link" type="button" onClick={() => { setAdding(false); setEditingMapId(map.id); }}><Edit3 size={14} /> Editar</button>{!isPrimary && <button className="text-link text-link--gold" type="button" onClick={() => onMakePrimary(map.id)}>Definir como principal</button>}<button className="icon-button icon-button--small" type="button" onClick={() => onDeleteMap(map.id)} aria-label={`Excluir mapa de ${map.profile.name}`}><Trash2 size={15} /></button></div>
            </article>;
          })}
        </div>}
      </section>

      {formOpen && <section className="section-block map-form-section"><div className="section-heading-row"><SectionHeading eyebrow={adding ? "NOVO MAPA" : "EDITAR MAPA"} title={adding ? "Adicionar uma leitura" : `Revisar ${editingMap?.profile.name ?? "mapa"}`} /><button className="text-link" type="button" onClick={closeForm}>Cancelar</button></div><ProfileForm initialProfile={editingMap?.profile ?? null} onSave={(profile) => { onSaveMap(profile, editingMap?.id ?? null); closeForm(); }} /></section>}

      <section className="section-block backup-section"><SectionHeading eyebrow="SEUS DADOS" title="Dados e privacidade" /><p>Seus mapas, interpretações e a última semana do mapa principal ficam neste aparelho. O backup inclui todos os mapas salvos e não transfere autorização de acesso.</p><div className="backup-actions"><button className="button button--secondary" onClick={onExportBackup}><Download size={17} /> Exportar backup</button><label className="button button--secondary file-button"><Upload size={17} /> Restaurar backup<input type="file" accept="application/json,.json" onChange={(event) => onImportBackup(event.target.files?.[0])} /></label></div><p className="backup-caution"><ShieldCheck size={15} /> Sem conta ou sincronização: guarde uma cópia antes de limpar o navegador ou trocar de aparelho.</p></section>

      <section className="delete-section"><div><strong>Apagar todos os dados deste aparelho</strong><p>Remove todos os mapas, leituras, semana, registros v2 e acesso de teste. Um backup anterior não é afetado.</p><p className="delete-section__warning">Esta é diferente da lixeira de um mapa: aqui todos os dados locais serão perdidos e não poderão ser recuperados sem um backup.</p></div><button className="button button--danger" onClick={onDeleteData}>Apagar tudo</button></section>
    </>
  );
}
