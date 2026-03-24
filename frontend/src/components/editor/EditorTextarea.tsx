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
  /** Extra CSS class for textarea size variant (lg, xl) */
  sizeVariant?: 'lg' | 'xl';
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
  sizeVariant = 'xl',
}) => {
  const charCount = value.length;
  const isWarn = charCount > warnThreshold;

  return (
    <section id={sectionId} aria-labelledby={headingId}>
      <div className="section-header">
        <h2 id={headingId} className="section-title">{heading}</h2>
        <p className="section-desc">{description}</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={textareaId}>{label}</label>
        <textarea
          id={textareaId}
          className={`form-textarea ${sizeVariant}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={counterId}
        />
        <div className="textarea-footer">
          <span
            id={counterId}
            className={`char-count${isWarn ? ' warn' : ''}`}
            aria-live="polite"
          >
            {charCount.toLocaleString()}자
          </span>
        </div>
      </div>
    </section>
  );
};
