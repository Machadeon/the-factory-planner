"use client";

import ClearAllIcon from "@mui/icons-material/ClearAll";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useState } from "react";
import type Factory from "../models/factory";
import type { ScoringObjective } from "../models/factory";
import type { StorageLibrary } from "../models/factory-storage";
import ConstraintsPanel from "./ConstraintsPanel";
import { HorizontalDivider } from "./Dividers";
import ProductionTargetsBar from "./ProductionTargetsBar";
import RecipeOptimizerPanel from "./RecipeOptimizerPanel";

const OBJECTIVE_LABELS: Record<ScoringObjective, string> = {
  minResources: "Min resources",
  sinkPoints: "Max sink points",
  power: "Min power",
  buildings: "Min buildings",
  logistics: "Min logistics",
  inputValue: "Min input value",
};

interface OptimizationSectionProps {
  factory: Factory;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
}

export default function OptimizationSection({
  factory,
  library,
  currentFactoryId,
}: OptimizationSectionProps) {
  const [showRejectAllConfirm, setShowRejectAllConfirm] = useState(false);

  const suggestedLineCount = factory.productionLines.filter(
    (pl) => pl.autoCreated,
  ).length;
  const suggestedRecipeCount = factory.productionLines.reduce(
    (acc, pl) =>
      acc +
      (pl.autoCreated
        ? 0
        : pl.assemblyLines.filter((al) => al.autoCreated).length),
    0,
  );
  const suggestionCount = suggestedLineCount + suggestedRecipeCount;

  function acceptAllSuggestions() {
    for (const pl of factory.productionLines) {
      pl.autoCreated = false;
      for (const al of pl.assemblyLines) al.autoCreated = false;
    }
    factory.update();
  }

  function rejectAllSuggestions() {
    const slugs: string[] = [];
    factory.productionLines = factory.productionLines.filter((pl) => {
      if (pl.autoCreated) {
        for (const al of pl.assemblyLines) {
          if (!al.recipe.isFactoryRecipe) slugs.push(al.recipe.slug);
        }
        return false;
      }
      pl.assemblyLines = pl.assemblyLines.filter((al) => {
        if (al.autoCreated) {
          if (!al.recipe.isFactoryRecipe) slugs.push(al.recipe.slug);
          return false;
        }
        return true;
      });
      return true;
    });
    factory.applyRejectSilent(slugs);
    setShowRejectAllConfirm(false);
    factory.update();
  }

  return (
    <div className="flex flex-col overflow-y-auto p-4 gap-y-2">
      <ProductionTargetsBar
        factory={factory}
        library={library}
        currentFactoryId={currentFactoryId}
      />

      <HorizontalDivider />
      <ConstraintsPanel factory={factory} />

      <HorizontalDivider />
      <RecipeOptimizerPanel
        factory={factory}
        library={library}
        currentFactoryId={currentFactoryId}
      />

      <HorizontalDivider />
      <div>
        <p className="text-lg mb-1">Suggestions</p>
        <p className="text-sm text-gray-400 mb-1">
          {OBJECTIVE_LABELS[factory.optimizer.objective]}
          {factory.optimizer.eager ? " · eager" : ""} ·{" "}
          {factory.optimizer.overwrite ? "overwrite" : "fill gaps"} · phase{" "}
          {factory.optimizer.phase}
        </p>
        {suggestionCount > 0 && (
          <p className="text-sm text-gray-400 mb-1">
            {suggestionCount} suggested{" "}
            {suggestionCount === 1 ? "recipe" : "recipes"}
          </p>
        )}
        <Button
          variant="outlined"
          startIcon={<PlayArrowIcon />}
          onClick={() => {
            factory.optimizeRecipes();
            factory.update();
          }}
        >
          Optimize recipes
        </Button>
        {suggestionCount > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={acceptAllSuggestions}
            >
              Accept all
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="warning"
              startIcon={<ClearAllIcon />}
              onClick={() => setShowRejectAllConfirm(true)}
            >
              Reject all
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={showRejectAllConfirm}
        onClose={() => setShowRejectAllConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reject all suggestions?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-400">
            This removes all auto-suggested production lines and recipes. This
            cannot be undone.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectAllConfirm(false)}>Cancel</Button>
          <Button
            onClick={rejectAllSuggestions}
            variant="contained"
            color="warning"
          >
            Reject all
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
