"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { SyntheticEvent } from "react";
import { parts } from "../../models/game-data";
import type Part from "../../models/part";
import Icon from "./Icon";

interface PartSelectorProps {
  existingParts: string[];
  onPartSelected: (part: Part) => void;
  [key: string]: unknown;
}

export default function PartSelector({
  existingParts,
  onPartSelected,
  ...other
}: PartSelectorProps) {
  const partsOptions = parts
    .filter((part) => existingParts.indexOf(part.slug) < 0)
    .map((part) => {
      return { label: part.name, part: part };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  function onChange(
    _: SyntheticEvent<Element, Event>,
    option: { label: string; part: Part } | null,
  ) {
    if (option) onPartSelected(option.part);
  }

  return (
    <Autocomplete
      {...other}
      openOnFocus
      options={partsOptions}
      renderInput={(params) => (
        <TextField {...params} label="Part" autoFocus size="small" />
      )}
      renderOption={(params, option) => (
        <li {...params} key={params.key}>
          <Icon
            key={option.part.slug}
            src={option.part.iconSmall}
            label={option.label}
            size={24}
            className="inline mr-2"
          />
          {option.label}
        </li>
      )}
      onChange={onChange}
    />
  );
}
