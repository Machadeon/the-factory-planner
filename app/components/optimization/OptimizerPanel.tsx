"use client";

import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { useState } from "react";
import { useFactory } from "@/app/contexts/FactoryContext";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type {
  RecipeOptimizerConfig,
  ScoringObjective,
} from "../../models/optimizer-config";
import Button from "../ui/Button";
import { HorizontalDivider } from "../ui/Dividers";
import { Radio, RadioGroup } from "../ui/RadioGroup";
import Switch from "../ui/Switch";
import Tooltip from "../ui/Tooltip";
import AvailablePartsEditor from "./AvailablePartsEditor";
import OptimizerRecipeFilters from "./OptimizerRecipeFilters";
import PointValuesPanel from "./PointValuesPanel";
import SourceFactoriesEditor from "./SourceFactoriesEditor";

const OBJECTIVE_OPTIONS: {
  value: ScoringObjective;
  label: string;
  help?: string;
}[] = [
  {
    value: "minResources",
    label: "Minimum resource consumption",
    help: "Prefer recipes that ultimately use fewer raw resources to produce the same output. This often uses more power and/or requires more space.",
  },
  {
    value: "sinkPoints",
    label: "Maximum AWESOME sink point yield",
    help: "Prefer recipes that use less valuable or fewer inputs to produce the same output. This often uses more power and/or requires more space.",
  },
  {
    value: "power",
    label: "Minimum power consumption",
    help: "Prefer recipes that use less power to produce the same output. This often uses smaller and fewer buildings but consumes more resources.",
  },
  {
    value: "buildings",
    label: "Minimum factory size",
    help: "Prefer recipes from smaller buildings, or that require fewer buildings. This often consumes more resources.",
  },
  {
    value: "logistics",
    label: "Simple logistics",
    help: "Prefer recipes that minimize byproducts and parts per minute between recipes. This often consumes more resources.",
  },
  {
    value: "inputValue",
    label: "Minimum inputs based on custom point values",
    help: "Prefer recipes that minimize total resource consumption based on global limits using a custom point system. Configure part point value by clicking on the button to the right.",
  },
];

// Inline, always-visible optimizer config (formerly RecipeOptimizerOptionsDialog).
// Live-write: edits write straight to factory.optimizer. Config only affects the
// next Solve/Optimize, so we do not auto-solve here (eager handles auto-rerun).
export default function OptimizerPanel() {
  const factory = useFactory();
  const { library, updatePartPointOverrides } = useLibraryContext();
  const [showPointValues, setShowPointValues] = useState(false);

  const config = factory.optimizer;

  function commit(next: RecipeOptimizerConfig) {
    factory.setOptimizerConfig(next);
  }

  function update(patch: Partial<RecipeOptimizerConfig>) {
    commit({ ...factory.optimizer, ...patch });
  }

  return (
    <div>
      <p className="text-lg mb-2">Recipe Optimizer</p>

      {/* Run mode */}
      <Switch
        checked={config.eager}
        onChange={(v) => update({ eager: v })}
        label="Re-run on every edit (eager)"
      />
      <p className="text-xs text-gray-400 mb-1">
        May be slow with many recipes.
      </p>

      <HorizontalDivider />

      {/* Scoring objective */}
      <p className="text-lg mt-2 mb-1">Optimize for</p>
      <RadioGroup
        name="optimizer-objective"
        value={config.objective}
        onChange={(v) => update({ objective: v as ScoringObjective })}
      >
        {OBJECTIVE_OPTIONS.map((o) => (
          <div
            key={o.value}
            className="flex flex-row items-center rounded -mx-1 px-1 hover:bg-white/5"
          >
            <Radio
              value={o.value}
              size="small"
              className="grow"
              label={
                <div className="flex">
                  {o.label}
                  <Tooltip title={o.help}>
                    <HelpOutlineOutlinedIcon className="ml-1" />
                  </Tooltip>
                </div>
              }
            />
            {o.value === "inputValue" && (
              <Button
                variant="contained"
                size="small"
                onClick={() => setShowPointValues((v) => !v)}
              >
                {showPointValues ? "Hide Values" : "Customize Point Values"}
              </Button>
            )}
          </div>
        ))}
      </RadioGroup>

      {showPointValues && (
        <PointValuesPanel
          factory={factory}
          library={library}
          onUpdateLibrary={updatePartPointOverrides}
        />
      )}

      <HorizontalDivider />

      {/* Keep vs overwrite */}
      <div className="text-md mt-2">
        Should the optimizer replace existing recipes?
      </div>
      <Switch
        checked={config.overwrite}
        onChange={(v) => update({ overwrite: v })}
        label={
          config.overwrite
            ? "Overwrite all recipes"
            : "Fill gaps only (keep my recipes)"
        }
      />

      <HorizontalDivider />

      <OptimizerRecipeFilters />

      <HorizontalDivider />

      <AvailablePartsEditor />
      <SourceFactoriesEditor />
    </div>
  );
}
