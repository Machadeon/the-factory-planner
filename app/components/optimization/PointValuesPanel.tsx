"use client";

import ClearIcon from "@mui/icons-material/Clear";
import { Fragment, useMemo, useState } from "react";
import { displayNum } from "@/app/lib/format";
import type Factory from "../../models/factory";
import type { StorageLibrary } from "../../models/factory-storage";
import { parts } from "../../models/game-data";
import {
  computeDefaultPointValues,
  resolveEffectivePointValues,
} from "../../models/point-values";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import TextCalculatorField from "../ui/TextCalculatorField";
import TextField from "../ui/TextField";
import Tooltip from "../ui/Tooltip";

interface PointValuesPanelProps {
  factory: Factory;
  library?: StorageLibrary;
  onUpdateLibrary: (overrides: Record<string, number>) => void;
}

export default function PointValuesPanel({
  factory,
  library,
  onUpdateLibrary,
}: PointValuesPanelProps) {
  const [search, setSearch] = useState("");

  const globalOverrides = useMemo(
    () => library?.partPointOverrides ?? {},
    [library?.partPointOverrides],
  );
  // Not memoized: factory is a stable ref whose .partPointOverrides is replaced
  // (not mutated) on every write, so the identity change is caught by useMemo below.
  const factoryOverrides = factory.partPointOverrides;

  const defaults = useMemo(() => computeDefaultPointValues(), []);
  const effective = useMemo(
    () => resolveEffectivePointValues(globalOverrides, factoryOverrides),
    [globalOverrides, factoryOverrides],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) => p.name.toLowerCase().includes(q));
  }, [search]);

  function setGlobalOverride(slug: string, value: number) {
    onUpdateLibrary({ ...globalOverrides, [slug]: value });
  }

  function clearGlobalOverride(slug: string) {
    const next = { ...globalOverrides };
    delete next[slug];
    onUpdateLibrary(next);
  }

  function setFactoryOverride(slug: string, value: number) {
    factory.setPartPointOverride(slug, value);
  }

  function clearFactoryOverride(slug: string) {
    const next = { ...factoryOverrides };
    delete next[slug];
    factory.setPartPointOverrides(next);
  }

  return (
    <div className="mt-2">
      <TextField
        size="small"
        placeholder="Search parts…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2"
        fullWidth
        endAdornment={
          search ? (
            <IconButton
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="p-1"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          ) : undefined
        }
      />

      <div
        className="grid gap-y-1"
        style={{ gridTemplateColumns: "auto 1fr repeat(3, 7rem) auto auto" }}
      >
        {/* Header */}
        <div className="col-span-2 text-xs text-gray-400 pb-1">Part</div>
        <div className="text-xs text-gray-400 pb-1 text-right">Default</div>
        <div className="text-xs text-gray-400 pb-1 text-right px-1">Global</div>
        <div className="text-xs text-gray-400 pb-1 text-right px-1">
          Factory
        </div>
        <div className="col-span-2" />

        {filtered.map((part) => {
          const def = defaults[part.slug] ?? 0;
          const gOv = globalOverrides[part.slug];
          const fOv = factoryOverrides[part.slug];
          const eff = effective[part.slug] ?? 0;
          if (def === 0 && gOv === undefined && fOv === undefined) return null;

          return (
            <Fragment key={part.slug}>
              <div className="flex items-center pr-1">
                <Icon
                  src={part.iconSmall}
                  label=""
                  size={20}
                  className="rounded"
                />
              </div>
              <div className="flex items-center text-sm truncate pr-2">
                <Tooltip title={`Effective: ${displayNum(eff)} pts/unit`}>
                  <span
                    className={
                      fOv !== undefined || gOv !== undefined
                        ? "text-yellow-300"
                        : ""
                    }
                  >
                    {part.name}
                  </span>
                </Tooltip>
              </div>
              <div className="flex items-center justify-end text-xs text-gray-400">
                {displayNum(def)}
              </div>
              <div className="px-1">
                <TextCalculatorField
                  size="small"
                  className="w-28"
                  inputClassName="text-xs text-right"
                  value={gOv !== undefined ? displayNum(gOv) : ""}
                  placeholder={displayNum(def)}
                  onCalculate={(v) => setGlobalOverride(part.slug, v)}
                  onClear={() => clearGlobalOverride(part.slug)}
                  allowClear={gOv !== undefined}
                />
              </div>
              <div className="px-1">
                <TextCalculatorField
                  size="small"
                  className="w-28"
                  inputClassName="text-xs text-right"
                  value={fOv !== undefined ? displayNum(fOv) : ""}
                  placeholder={
                    gOv !== undefined ? displayNum(gOv) : displayNum(def)
                  }
                  onCalculate={(v) => setFactoryOverride(part.slug, v)}
                  onClear={() => clearFactoryOverride(part.slug)}
                  allowClear={fOv !== undefined}
                />
              </div>
              <div className="col-span-2" />
            </Fragment>
          );
        })}
      </div>

      {filtered.every((p) => {
        const def = defaults[p.slug] ?? 0;
        return (
          def === 0 && !globalOverrides[p.slug] && !factoryOverrides[p.slug]
        );
      }) && (
        <p className="text-sm text-gray-400 text-center py-4">No parts match</p>
      )}
    </div>
  );
}
