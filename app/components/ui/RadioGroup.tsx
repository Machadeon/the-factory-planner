import { createContext, type ReactNode, useContext } from "react";

interface RadioGroupContextValue {
  name: string;
  value: string;
  onChange: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

// Context-based group (not an options array) — callers like OptimizerPanel
// compose extra per-option content (help tooltip, action button) around each
// Radio, which a flat {value,label}[] API couldn't express.
export function RadioGroup({
  name,
  value,
  onChange,
  children,
  className,
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange }}>
      <div role="radiogroup" className={className}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioProps {
  value: string;
  label: ReactNode;
  size?: "small" | "medium";
  className?: string;
}

export function Radio({
  value,
  label,
  size = "medium",
  className,
}: RadioProps) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error("Radio must be used within a RadioGroup");
  const inputSize = size === "small" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <label
      className={`inline-flex items-center gap-x-1.5 cursor-pointer ${className ?? ""}`}
    >
      <input
        type="radio"
        name={ctx.name}
        value={value}
        checked={ctx.value === value}
        onChange={() => ctx.onChange(value)}
        className={`${inputSize} accent-amber-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500`}
      />
      {label}
    </label>
  );
}
