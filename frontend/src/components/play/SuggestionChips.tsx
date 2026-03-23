import { type FC } from 'react';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export const SuggestionChips: FC<SuggestionChipsProps> = ({
  suggestions,
  onSelect,
  disabled,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestion-chips">
      {suggestions.map((s, i) => (
        <button
          key={i}
          className="suggestion-chip"
          onClick={() => !disabled && onSelect(s)}
          disabled={disabled}
        >
          {s}
        </button>
      ))}
    </div>
  );
};
