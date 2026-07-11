"use client";

import ClearAllIcon from "@mui/icons-material/ClearAll";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import Button from "@mui/material/Button";
import { useState } from "react";
import {
  useFactory,
  useFactoryUpdateSubscription,
} from "@/app/contexts/FactoryContext";
import type { ScoringObjective } from "../models/optimizer-config";
import {
  acceptAllSuggestions,
  rejectAllSuggestions,
} from "../models/suggestions";
import ConstraintsPanel from "./ConstraintsPanel";
import { HorizontalDivider } from "./Dividers";
import ProductionTargetsBar from "./ProductionTargetsBar";
import RecipeOptimizerPanel from "./RecipeOptimizerPanel";
import ConfirmDialog from "./ui/ConfirmDialog";

const OBJECTIVE_LABELS: Record<ScoringObjective, string> = {
  minResources: "Min resources",
  sinkPoints: "Max sink points",
  power: "Min power",
  buildings: "Min buildings",
  logistics: "Min logistics",
  inputValue: "Min input value",
};

export default function OptimizationSection() {
  const factory = useFactory();
  useFactoryUpdateSubscription();
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

  function acceptAll() {
    acceptAllSuggestions(factory);
    factory.update();
  }

  function rejectAll() {
    rejectAllSuggestions(factory);
    setShowRejectAllConfirm(false);
    factory.update();
  }

  return (
    <div className="flex flex-col overflow-y-auto p-4 gap-y-2">
      <ProductionTargetsBar />

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
        {suggestionCount > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={acceptAll}
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

      <HorizontalDivider />
      <ConstraintsPanel factory={factory} />

      <HorizontalDivider />
      <RecipeOptimizerPanel />

      <ConfirmDialog
        open={showRejectAllConfirm}
        title="Reject all suggestions?"
        message={
          <p className="text-sm text-gray-400">
            This removes all auto-suggested production lines and recipes. This
            cannot be undone.
          </p>
        }
        confirmLabel="Reject all"
        severity="warning"
        onConfirm={rejectAll}
        onCancel={() => setShowRejectAllConfirm(false)}
      />
    </div>
  );
}
