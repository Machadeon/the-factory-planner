"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useFactory } from "@/app/contexts/FactoryContext";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import { rateUnit } from "@/app/lib/format";
import { partSlugLookup } from "../models/game-data";
import type { Target } from "../models/optimizer-config";
import PartSelector from "./PartSelector";
import TextCalculatorField from "./TextCalculatorField";
import AddItemControl from "./ui/AddItemControl";
import Icon from "./ui/Icon";
import IconButton from "./ui/IconButton";

export default function ProductionTargetsBar() {
  const factory = useFactory();
  const { library } = useLibraryContext();
  const targets = factory.optimizer.targets;

  function setTargets(next: Target[]) {
    factory.optimizer.targets = next;
    factory.update();
  }

  function addTarget(partSlug: string) {
    if (!targets.some((t) => t.partSlug === partSlug)) {
      setTargets([...targets, { partSlug }]);
    }
  }

  function updateTargetRate(partSlug: string, rate: number | undefined) {
    setTargets(
      targets.map((t) =>
        t.partSlug === partSlug ? { ...t, rate, maximize: false } : t,
      ),
    );
  }

  function toggleMaximize(partSlug: string) {
    setTargets(
      targets.map((t) =>
        t.partSlug === partSlug ? { ...t, maximize: !t.maximize } : t,
      ),
    );
  }

  function removeTarget(partSlug: string) {
    setTargets(targets.filter((t) => t.partSlug !== partSlug));
  }

  function solve() {
    factory.optimizeRecipes(library.partPointOverrides ?? {});
    factory.update();
  }

  return (
    <div className="p-4 pb-2">
      <div className="flex flex-row items-center mb-2">
        <span className="text-xl grow">Production Targets</span>
      </div>

      {targets.length === 0 && (
        <p className="text-sm text-gray-400 mb-1">
          Add a product and rate, then Solve to select recipes automatically.
        </p>
      )}

      {targets.map((t) => {
        const part = partSlugLookup[t.partSlug];
        if (!part) return null;
        const unit = rateUnit(part);
        return (
          <div
            key={t.partSlug}
            className="flex flex-row items-center gap-x-2 mb-2"
          >
            <Icon src={part.iconSmall} alt={part.name} size={24} />
            <span className="text-sm grow">{part.name}</span>
            {t.maximize ? (
              <TextField
                variant="outlined"
                size="small"
                label="Target rate"
                className="w-32"
                disabled
                value="max"
              />
            ) : (
              <TextCalculatorField
                variant="outlined"
                size="small"
                label="Target rate"
                className="w-32"
                value={t.rate ?? ""}
                allowClear
                onCalculate={(v) => updateTargetRate(t.partSlug, v)}
                onClear={() => updateTargetRate(t.partSlug, undefined)}
              />
            )}
            <span className="text-sm w-10">{unit}</span>
            <IconButton
              aria-label={
                t.maximize
                  ? "Stop maximizing output"
                  : "Maximize output (limited by constraints)"
              }
              onClick={() => toggleMaximize(t.partSlug)}
              className="p-1"
            >
              <TrendingUpIcon
                sx={{
                  color: t.maximize ? "primary.main" : "action.active",
                }}
              />
            </IconButton>
            <IconButton
              aria-label="Remove target"
              title=""
              onClick={() => removeTarget(t.partSlug)}
              className="p-1"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        );
      })}

      <div className="flex flex-row items-center gap-x-2 mt-1">
        <AddItemControl
          label="Add target"
          triggerClassName="flex flex-row items-center p-1 grow"
          className="grow"
        >
          {(close) => (
            <PartSelector
              existingParts={targets.map((t) => t.partSlug)}
              onPartSelected={(part) => {
                addTarget(part.slug);
                close();
              }}
            />
          )}
        </AddItemControl>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={solve}
          disabled={targets.length === 0}
        >
          Optimize recipes
        </Button>
      </div>
    </div>
  );
}
