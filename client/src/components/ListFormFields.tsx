import { LIST_COLOR_OPTIONS, LIST_EMOJI_OPTIONS } from "../lib/listConstants";

interface ListFormFieldsProps {
  name: string;
  emoji: string;
  color: string | null;
  onNameChange: (value: string) => void;
  onEmojiChange: (value: string) => void;
  onColorChange: (value: string | null) => void;
  namePlaceholder?: string;
}

export function ListFormFields({
  name,
  emoji,
  color,
  onNameChange,
  onEmojiChange,
  onColorChange,
  namePlaceholder = "Назва списку...",
}: ListFormFieldsProps) {
  return (
    <>
      <div className="list-form__emoji-row">
        {LIST_EMOJI_OPTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onEmojiChange(e)}
            className={`list-form__emoji ${emoji === e ? "list-form__emoji--active" : ""}`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="list-form__color-row mt-3">
        {LIST_COLOR_OPTIONS.map((c) => (
          <button
            key={c.label}
            type="button"
            title={c.label}
            onClick={() => onColorChange(c.value)}
            className={`list-form__color ${color === c.value ? "list-form__color--active" : ""}`}
            style={c.value ? { background: c.value } : undefined}
          >
            {!c.value && "—"}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={name}
        onChange={(ev) => onNameChange(ev.target.value)}
        placeholder={namePlaceholder}
        className="input-field mt-3"
        maxLength={60}
      />
    </>
  );
}