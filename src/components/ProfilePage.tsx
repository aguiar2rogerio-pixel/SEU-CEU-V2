import { Download, ShieldCheck, Upload } from "lucide-react";
import { ProfileForm } from "./ProfileForm";
import { SectionHeading } from "./SectionHeading";
import type { BirthProfile } from "../lib/types";

type Props = {
  profile: BirthProfile;
  onSaveProfile: (profile: BirthProfile) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => void;
  onDeleteData: () => void;
};

export function ProfilePage({
  profile,
  onSaveProfile,
  onExportBackup,
  onImportBackup,
  onDeleteData,
}: Props) {
  return (
    <>
      <section className="page-intro">
        <span className="eyebrow">SEU ESPAÇO</span>
        <h1>Perfil e cuidado.</h1>
        <p>Seus dados pertencem a este navegador. Você pode levar uma cópia com você.</p>
      </section>
      <ProfileForm initialProfile={profile} onSave={onSaveProfile} />
      <section className="section-block backup-section">
        <SectionHeading eyebrow="SEUS DADOS" title="Faça uma cópia" />
        <p>O backup inclui seu perfil e a última semana calculada. Guarde o arquivo em um local seguro; ele contém dados pessoais.</p>
        <div className="backup-actions">
          <button className="button button--secondary" onClick={onExportBackup}>
            <Download size={17} /> Exportar backup
          </button>
          <label className="button button--secondary file-button">
            <Upload size={17} /> Restaurar backup
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => onImportBackup(event.target.files?.[0])}
            />
          </label>
        </div>
        <p className="backup-caution">
          <ShieldCheck size={15} /> Sem conta ou sincronização: ao limpar os dados do navegador ou trocar de aparelho, o perfil pode desaparecer. Recomendamos exportar uma cópia.
        </p>
      </section>
      <section className="delete-section">
        <div>
          <strong>Apagar dados deste aparelho</strong>
          <p>Remove o perfil e as leituras salvas. Um backup anterior não é afetado.</p>
        </div>
        <button className="button button--danger" onClick={onDeleteData}>Apagar</button>
      </section>
    </>
  );
}
