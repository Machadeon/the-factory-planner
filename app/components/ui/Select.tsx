import MuiMenuItem from "@mui/material/MenuItem";
import MuiSelect from "@mui/material/Select";

interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  size?: "small" | "medium";
  label?: string;
  fullWidth?: boolean;
  className?: string;
  "aria-label"?: string;
}

// Thin wrap-and-hide for MUI Select+MenuItem (allowlisted listbox widget,
// ADR-0001) — the accessible listbox/keyboard behavior stays MUI's, callers
// get a flat options-array API instead of composing MenuItem themselves.
export default function Select({
  value,
  onChange,
  options,
  size = "medium",
  label,
  fullWidth,
  className,
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <MuiSelect
      size={size}
      value={value}
      label={label}
      fullWidth={fullWidth}
      className={className}
      inputProps={{ "aria-label": ariaLabel ?? label }}
      onChange={(e) => onChange(String(e.target.value))}
    >
      {options.map((o) => (
        <MuiMenuItem key={o.value} value={o.value}>
          {o.label}
        </MuiMenuItem>
      ))}
    </MuiSelect>
  );
}
