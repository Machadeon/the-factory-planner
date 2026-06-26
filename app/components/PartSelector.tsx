"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Image from "next/image";
import type { SyntheticEvent } from "react";
import { parts } from "../models/library";
import type Part from "../models/part";

interface PartSelectorProps {
  existingParts: string[];
  onPartSelected: (part: Part) => void;
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
      options={partsOptions}
      renderInput={(params) => <TextField {...params} label="Part" autoFocus />}
      renderOption={(params, option) => (
        <li {...params} key={params.key}>
          <Image
            key={option.part.slug}
            src={option.part.iconSmall}
            alt={option.label}
            width={24}
            height={24}
            className="inline mr-2"
          />
          {option.label}
        </li>
      )}
      onChange={onChange}
    />
  );
}
