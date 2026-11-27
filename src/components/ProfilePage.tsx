import { useState } from "react";
import { Download, Map, Plus, ShieldCheck, Trash2, Upload } from "lucide-react";
import { ProfileForm } from "./ProfileForm";
import { SectionHeading } from "./SectionHeading";
import type { BirthProfile, NatalMapRecord } from "../lib/types";

type Props = {
  maps: NatalMapRecord[];
  openMapId: string | null;
  onOpenMap: (id: string) => void;
  onSaveReading: (profile: BirthProfile) => Promise<boolean>;
  onDeleteMap: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => void;
  onDeleteData: () => void;
};

export function ProfilePage({ maps, openMapId, onOpenMap, onSaveReading, onDeleteMap, onExportBackup, onImportBackup, onDeleteData }: Props) {
  const [adding, setAdding] = useState(false);

  function closeForm() {
    setAdding(false);
  }

  return (
    <>
      <section className="page-intro">
        <span className="eyebrow">SEU ESPAÇO</span>
        <h1>Leituras e segurança.</h1>
        <p>Crie mapas para familiares e amigos, consulte o histórico e guarde as interpretações neste aparelho.</p>
      </section>

      <section className="section-block readings-maps-section" aria-label="Histórico de leituras">
        <div className="section-heading-row"><SectionHeading eyebrow="HISTÓRICO DE LEITURAS" title="Mapas realizados" /><button className="button button--primary" type="button" onClick={() => setAdding(true)}><Plus size={16} /> Novo mapa</button></div>
        {maps.length === 0 ? <div className="map-empty-state"><Map size={19} /><div><strong>Nenhuma leitura salva</strong><p>Cadastre os dados de uma pessoa para calcular o mapa e guardar a interpretação.</p></div></div> : <div className="saved-map-list">
          {maps.map((map) => {
            const hasReading = Boolean(map.readings.natal?.text);
            return <article className={`saved-map-card${openMapId === map.id ? " saved-map-card--selected" : ""}`} key={map.id}>
              <button className="saved-map-card__main" type="button" onClick={() => onOpenMap(map.id)}><span className="saved-map-card__icon"><Map size={19} /></span><span className="saved-map-card__copy"><strong>{map.profile.name}</strong><small>Mapa natal calculado · clique para consultar</small><em>{hasReading ? "Leitura de IA salva" : "Aguardando interpretação de IA"}</em></span></button>
              <div className="saved-map-card__actions"><button className="text-link" type="button" onClick={() => onOpenMap(map.id)}>Abrir leitura</button><button className="icon-button icon-button--small" type="button" onClick={() => onDeleteMap(map.id)} aria-label={`Excluir mapa de ${map.profile.name}`} title="Excluir mapa"><Trash2 size={15} /></button></div>
            </article>;
          })}
        </div>}
      </section>

      {adding && <section className="section-block map-form-section"><div className="section-heading-row"><SectionHeading eyebrow="NOVO MAPA" title="Cadastrar uma leitura" /><button className="text-link" type="button" onClick={closeForm}>Cancelar</button></div><div className="reading-form-warning"><strong>Confira antes de calcular</strong><p>Depois de salvo, este mapa não poderá ser editado. Se houver algum erro, será necessário excluí-lo e criar outro.</p></div><ProfileForm onSave={(profile) => { if (!window.confirm("Os dados informados estão corretos? Depois de calcular, este mapa não poderá ser editado.")) return; void onSaveReading(profile).then((saved) => { if (saved) closeForm(); }); }} /></section>}

      <section className="section-block backup-section"><SectionHeading eyebrow="SEGURANÇA E DADOS" title="Proteja seu histórico" /><p>Exporte seus mapas e interpretações para guardar uma cópia. A restauração não transfere autorização de acesso.</p><div className="backup-actions"><button className="button button--secondary" onClick={onExportBackup}><Download size={17} /> Exportar histórico</button><label className="button button--secondary file-button"><Upload size={17} /> Restaurar histórico<input type="file" accept="application/json,.json" onChange={(event) => onImportBackup(event.target.files?.[0])} /></label></div><p className="backup-caution"><ShieldCheck size={15} /> Os dados ficam neste aparelho e não são enviados automaticamente para uma IA.</p></section>

      <section className="delete-section"><div><strong>Apagar histórico de leituras</strong><p>Remove todos os mapas de terceiros e as interpretações salvas, preservando o mapa pessoal.</p><p className="delete-section__warning">Esta ação é diferente de excluir uma leitura individual e exige confirmação.</p></div><button className="button button--danger" onClick={onDeleteData}>Apagar histórico</button></section>
    </>
  );
}
