// components/editor/EditorTextarea.tsx
// Reusable textarea with heading, description, char counter, and warn threshold

import { type FC } from 'react';

interface EditorTextareaProps {
  /** Section id for anchor navigation */
  sectionId: string;
  /** Heading id for aria-labelledby */
  headingId: string;
  /** Section heading text */
  heading: string;
  /** Subtitle below heading */
  description: string;
  /** Label shown above the textarea */
  label: string;
  /** id attribute for the textarea */
  textareaId: string;
  /** id for aria-describedby (char counter) */
  counterId: string;
  /** Textarea value */
  value: string;
  /** Placeholder text */
  placeholder?: string;
  /** Callback on value change */
  onChange: (value: string) => void;
  /** Character count at which the counter turns red */
  warnThreshold?: number;
}

export const EditorTextarea: FC<EditorTextareaProps> = ({
  sectionId,
  headingId,
  heading,
  description,
  label,
  textareaId,
  counterId,
  value,
  placeholder,
  onChange,
  warnThreshold = 3000,
}) => {
  const charCount = value.length;
  const isWarn = charCount > warnThreshold;

  return (
    <section id={sectionId} aria-labelledby={headingId}>
      <div className="mb-7">
        <h2
          id={headingId}
          className="font-serif text-[22px] font-bold text-text-primary tracking-tight mb-1"
        >
          {heading}
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">{description}</p>
      </div>

      <div className="mb-5">
        <label
          className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary mb-1.5"
          htmlFor={textareaId}
        >
          {label}
        </label>
        <textarea
          id={textareaId}
          className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-3 font-serif text-sm leading-[1.85] text-text-primary outline-none resize-y min-h-[300px] transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] placeholder:text-text-muted placeholder:font-sans placeholder:text-[13px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={counterId}
        />
        <div className="flex justify-end mt-1">
          <span
            id={counterId}
            className={`text-[11px] ${isWarn ? 'text-[var(--rose)]' : 'text-text-muted'}`}
            aria-live="polite"
          >
            {charCount.toLocaleString()}자
          </span>
        </div>
      </div>
    </section>
  );
};
