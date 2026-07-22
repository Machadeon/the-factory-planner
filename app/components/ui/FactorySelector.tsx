"use client";

import MuiAutocomplete from "@mui/material/Autocomplete";
import MuiTextField from "@mui/material/TextField";

interface FactorySelectorOption {
  id: string;
  label: string;
}

interface FactorySelectorProps {
  options: FactorySelectorOption[];
  onFactorySelected: (option: FactorySelectorOption) => void;
}

// Same wrap-and-hide shape as PartSelector.tsx (Autocomplete is allowlisted,
// ADR-0001) for the one other combobox-picker shape in the app — a
// factory-name/id chooser rather than a part chooser, so PartSelector's
// Part-shaped API doesn't fit directly.
export default function FactorySelector({
  options,
  onFactorySelected,
}: FactorySelectorProps) {
  return (
    <MuiAutocomplete
      options={options}
      openOnFocus
      blurOnSelect
      value={null}
      onChange={(_, option) => {
        if (option) onFactorySelected(option);
      }}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      renderInput={(params) => (
        <MuiTextField
          {...params}
          size="small"
          label="Add source factory"
          autoFocus
        />
      )}
    />
  );
}
