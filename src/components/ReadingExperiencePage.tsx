import { Check, ChevronLeft, Copy, FileText, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import type { BirthProfile, NatalChart, WeeklyBundle } from "../lib/types";

export type ReadingExperienceId = "natal" | "current" | "yearly";

type Props = {
  experience: ReadingExperienceId;
  profile: BirthProfile;
  natal: NatalChart | null;
  bundle: WeeklyBundle | null;
  savedText: string;
  inputText: string;
  copied: boolean;
  isEditing: boolean;
  onBack: () => void;
  onCopyPrompt: () => void;
  onEdit: () => void;
  onClear: () => void;
  onInputChange: (value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
};

const CONTENT: Record<ReadingExperienceId, { eyebrow: string; title: string; intro: string; detail: string; button: string }> = {
  natal: {
    eyebrow: "MEU MAPA NATAL",
    title: "Uma leitura para voltar a si.",
    intro: "Uma interpretação integrada e permanente do mapa natal, para reconhecer personalidade, potencialidades, desafios, relacionamentos e vocação.",
    detail: "Use o prompt abaixo em uma IA de sua preferência e guarde o resultado aqui, neste aparelho.",
    button: "Copiar prompt do mapa natal",
  },
  current: {
    eyebrow: "MEU MOMENTO ATUAL",
    title: "O céu que está se movendo agora.",
    intro: "Uma leitura dos trânsitos e ciclos atuais em relação ao seu mapa natal, com atenção ao período que você está vivendo.",
    detail: "O prompt combina seu mapa com o céu calculado para esta semana. Recalcule o mapa quando quiser atualizar o período.",
    button: "Copiar prompt do momento atual",
  },
  yearly: {
    eyebrow: "MEU CÉU EM 2027",
    title: "Um ano para atravessar com presença.",
    intro: "Uma leitura anual personalizada, organizada por temas e períodos para ajudar você a observar os movimentos de 2027.",
    detail: "O prompt leva os dados do seu mapa para uma leitura anual. A interpretação pode ser guardada e consultada depois.",
    button: "Copiar prompt de 2027",
  },
};

export function ReadingExperiencePage({ experience, natal, bundle, savedText, inputText, copied, isEditing, onBack, onCopyPrompt, onEdit, onClear, onInputChange, onSave, onCancelEdit }: Props) {
  const content = CONTENT[experience];
  const hasData = Boolean(natal || bundle);

  return (
    <>
      <button className="reading-back" onClick={onBack}><ChevronLeft size={17} aria-hidden="true" /> Voltar para meu mapa</button>
      <section className="page-intro reading-experience-intro">
        <span className="eyebrow"><Sparkles size={14} aria-hidden="true" /> {content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
      </section>

      <section className="reading-experience-card">
        <SectionHeading eyebrow="COMO FUNCIONA" title="Uma experiência só sua" />
        <p>{content.detail}</p>
        {!hasData && <p className="reading-experience-warning">Seu mapa ainda está sendo calculado. Aguarde alguns instantes e tente novamente.</p>}
        <button className="button button--primary reading-experience-copy" onClick={onCopyPrompt} disabled={!hasData}>
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {copied ? "Prompt copiado" : content.button}
        </button>
        <small>O prompt não envia seus dados automaticamente. Você escolhe quando e onde usar a leitura.</small>
      </section>

      <section className="reading-notices" aria-label="Privacidade, segurança e funcionamento">
        <div className="reading-notice reading-notice--security">
          <ShieldCheck size={19} aria-hidden="true" />
          <div>
            <span className="eyebrow">PRIVACIDADE E SEGURANÇA</span>
            <p>O SEU CÉU não possui conexão direta com ferramentas externas de inteligência artificial e não envia seus dados automaticamente.</p>
            <p>Você escolhe qual IA deseja utilizar e decide quando e onde compartilhar as informações do seu mapa.</p>
            <p className="reading-notice__safety">Antes de colar o conteúdo na IA escolhida, leia e confira o que está sendo solicitado e quais informações serão compartilhadas. Isso é importante para sua segurança.</p>
          </div>
        </div>
        <div className="reading-notice reading-notice--how">
          <FileText size={18} aria-hidden="true" />
          <div>
            <span className="eyebrow">COMO FUNCIONA</span>
            <p>O SEU CÉU prepara o conteúdo do prompt localmente. Copie o conteúdo e utilize na ferramenta de inteligência artificial de sua preferência.</p>
            <p>A interpretação será realizada fora do aplicativo.</p>
          </div>
        </div>
      </section>

      <section className="section-block saved-reading-section" aria-label="Leitura guardada">
        <SectionHeading eyebrow="SUA LEITURA" title={savedText && !isEditing ? "Leitura guardada" : "Guarde uma leitura aqui"} />
        {savedText && !isEditing ? (
          <article className="saved-reading-card">
            <div className="saved-reading-card__topline"><span><FileText size={15} aria-hidden="true" /> Leitura salva neste aparelho</span><div><button className="text-link" onClick={onEdit}>Editar</button><button className="icon-button icon-button--small" onClick={onClear} aria-label="Apagar leitura"><Trash2 size={15} /></button></div></div>
            <div className="saved-reading-card__text">{savedText}</div>
          </article>
        ) : (
          <div className="reading-editor">
            <label htmlFor={`reading-${experience}`}>Cole abaixo o resultado gerado pela IA</label>
            <textarea id={`reading-${experience}`} rows={11} value={inputText} onChange={(event) => onInputChange(event.target.value)} placeholder="Cole aqui a leitura recebida…" />
            <div className="reading-editor__actions"><button className="button button--primary" onClick={onSave} disabled={!inputText.trim()}>Salvar leitura</button>{isEditing && <button className="button button--secondary" onClick={onCancelEdit}>Cancelar</button>}</div>
          </div>
        )}
      </section>
      <p className="reading-disclaimer">As interpretações astrológicas são simbólicas e voltadas à reflexão pessoal. Não substituem orientação profissional.</p>
    </>
  );
}

export function readingExperienceTitle(experience: ReadingExperienceId): string {
  return CONTENT[experience].eyebrow;
}
