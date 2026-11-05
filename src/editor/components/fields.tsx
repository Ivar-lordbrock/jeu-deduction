import type { ComponentChildren } from 'preact';

interface Base {
  label?: ComponentChildren;
  hint?: ComponentChildren;
}

export function TextField(
  p: Base & { value: string; onInput: (v: string) => void; placeholder?: string; big?: boolean },
) {
  return (
    <label class="field">
      {p.label && <span class="field-label">{p.label}</span>}
      <input
        class={p.big ? 'input big' : 'input'}
        value={p.value}
        placeholder={p.placeholder}
        onInput={(e) => p.onInput(e.currentTarget.value)}
      />
      {p.hint && <span class="field-hint">{p.hint}</span>}
    </label>
  );
}

export function TextArea(
  p: Base & { value: string; onInput: (v: string) => void; placeholder?: string; rows?: number },
) {
  return (
    <label class="field">
      {p.label && <span class="field-label">{p.label}</span>}
      <textarea
        class="input"
        rows={p.rows ?? 4}
        value={p.value}
        placeholder={p.placeholder}
        onInput={(e) => p.onInput(e.currentTarget.value)}
      />
      {p.hint && <span class="field-hint">{p.hint}</span>}
    </label>
  );
}

export function NumberField(p: Base & { value: number; onInput: (v: number) => void; min?: number; max?: number }) {
  return (
    <label class="field small">
      {p.label && <span class="field-label">{p.label}</span>}
      <input
        class="input"
        type="number"
        value={p.value}
        min={p.min}
        max={p.max}
        onInput={(e) => {
          const v = Number(e.currentTarget.value);
          if (Number.isFinite(v)) p.onInput(v);
        }}
      />
      {p.hint && <span class="field-hint">{p.hint}</span>}
    </label>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

export function Select<T extends string>(
  p: Base & { value: T; options: Option<T>[]; onChange: (v: T) => void },
) {
  return (
    <label class="field">
      {p.label && <span class="field-label">{p.label}</span>}
      <select class="input" value={p.value} onChange={(e) => p.onChange(e.currentTarget.value as T)}>
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {p.hint && <span class="field-hint">{p.hint}</span>}
    </label>
  );
}

/** Boutons collés pour choisir une option parmi quelques-unes. */
export function Segmented<T extends string>(p: { value: T; options: Option<T>[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div class="field">
      {p.label && <span class="field-label">{p.label}</span>}
      <div class="segmented" role="radiogroup">
        {p.options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={p.value === o.value}
            class={p.value === o.value ? 'active' : ''}
            onClick={() => p.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
