type Props = {
  eyebrow: string;
  title: string;
};

export function SectionHeading({ eyebrow, title }: Props) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}
