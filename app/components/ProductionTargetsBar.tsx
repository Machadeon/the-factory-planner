"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TuneIcon from "@mui/icons-material/Tune";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import { useState } from "react";
import type Factory from "../models/factory";
import type { Target } from "../models/factory";
import type { StorageLibrary } from "../models/factory-storage";
import { partSlugLookup } from "../models/library";
import Clickable from "./Clickable";
import PartSelector from "./PartSelector";
import RecipeOptimizerOptionsDialog from "./RecipeOptimizerOptionsDialog";
import TextCalculatorField from "./TextCalculatorField";

interface ProductionTargetsBarProps {
  factory: Factory;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
}

export default function ProductionTargetsBar({
  factory,
  library,
  currentFactoryId,
}: ProductionTargetsBarProps) {
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [showRecipeOptimizerDialog, setShowRecipeOptimizerDialog] =
    useState(false);

  const targets = factory.optimizer.targets;

  function setTargets(next: Target[]) {
    factory.optimizer.targets = next;
    factory.update();
  }

  function addTarget(partSlug: string) {
    if (!targets.some((t) => t.partSlug === partSlug)) {
      setTargets([...targets, { partSlug }]);
    }
    setShowPartSelector(false);
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
    factory.optimizeRecipes();
    factory.update();
  }

  return (
    <div className="p-4 pb-2">
      <div className="flex flex-row items-center mb-2">
        <span className="text-xl grow">Production Targets</span>
        <Clickable
          onClick={() => setShowRecipeOptimizerDialog(true)}
          className="flex flex-row items-center p-1"
        >
          <TuneIcon fontSize="small" />
          <span className="text-sm ml-1">Advanced options</span>
        </Clickable>
      </div>

      {targets.length === 0 && (
        <p className="text-sm text-gray-400 mb-1">
          Add a product and rate, then Solve to select recipes automatically.
        </p>
      )}

      {targets.map((t) => {
        const part = partSlugLookup[t.partSlug];
        if (!part) return null;
        const unit = part.slug === "power" ? "MW" : "/min";
        return (
          <div
            key={t.partSlug}
            className="flex flex-row items-center gap-x-2 mb-2"
          >
            <Image
              src={part.iconSmall}
              alt={part.name}
              width={24}
              height={24}
            />
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
            <Tooltip
              title={
                t.maximize
                  ? "Stop maximizing output"
                  : "Maximize output (limited by constraints)"
              }
            >
              <span>
                <Clickable
                  onClick={() => toggleMaximize(t.partSlug)}
                  className="p-1"
                >
                  <TrendingUpIcon
                    sx={{
                      color: t.maximize ? "primary.main" : "action.active",
                    }}
                  />
                </Clickable>
              </span>
            </Tooltip>
            <Clickable onClick={() => removeTarget(t.partSlug)} className="p-1">
              <DeleteIcon fontSize="small" />
            </Clickable>
          </div>
        );
      })}

      <div className="flex flex-row items-center gap-x-2 mt-1">
        {showPartSelector ? (
          <div className="grow">
            <PartSelector
              existingParts={targets.map((t) => t.partSlug)}
              onPartSelected={(part) => addTarget(part.slug)}
              onBlur={() => setShowPartSelector(false)}
            />
          </div>
        ) : (
          <Clickable
            onClick={() => setShowPartSelector(true)}
            className="flex flex-row items-center p-1 grow"
          >
            <AddIcon fontSize="small" />
            <span className="text-sm ml-1">Add target</span>
          </Clickable>
        )}
        <Button
          variant="contained"
          onClick={solve}
          disabled={targets.length === 0}
        >
          Solve
        </Button>
      </div>

      <RecipeOptimizerOptionsDialog
        open={showRecipeOptimizerDialog}
        onClose={() => setShowRecipeOptimizerDialog(false)}
        factory={factory}
        onApply={() => {}}
        library={library}
        currentFactoryId={currentFactoryId}
      />
    </div>
  );
}
