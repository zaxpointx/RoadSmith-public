import type { ReactNode } from "react";

type Tone = "blue" | "lime" | "violet";

type Props = {
  number: string; // "01" | "02" | "03"
  name: string; // short eyebrow label, e.g. "Audit"
  heading: string;
  body: string;
  tone?: Tone;
  children: ReactNode; // the visual card on the right
};

/**
 * ProcessSection — single numbered process section.
 * Two-column on desktop (text left, visual right), stacked on mobile.
 * Reuses the dark operator palette and JetBrains Mono number treatment.
 */
export function ProcessSection({
  number,
  name,
  heading,
  body,
  tone = "blue",
  children,
}: Props) {
  return (
    <article className={`operator-process operator-process-${tone}`}>
      <div className="operator-process-text">
        <div className="operator-process-meta">
          <span className="operator-process-num">{number}</span>
          <span className="operator-process-name">{name}</span>
        </div>
        <h3 className="operator-process-heading">{heading}</h3>
        <p className="operator-process-body">{body}</p>
      </div>
      <div className="operator-process-card">{children}</div>
    </article>
  );
}
