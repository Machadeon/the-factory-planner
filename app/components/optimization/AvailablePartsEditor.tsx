"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import { useFactory } from "@/app/contexts/FactoryContext";
import { partSlugLookup } from "../../models/game-data";
import type { RecipeOptimizerConfig } from "../../models/optimizer-config";
import AddItemControl from "../ui/AddItemControl";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import PartSelector from "../ui/PartSelector";
import TextCalculatorField from "../ui/TextCalculatorField";

// Part availability editor, lifted out of the former RecipeOptimizerPanel.
// Live-write: edits write straight to factory.optimizer.
export default function AvailablePartsEditor() {
  const factory = useFactory();
  const config = factory.optimizer;

  function commit(next: RecipeOptimizerConfig) {
    factory.setOptimizerConfig(next);
  }

  function update(patch: Partial<RecipeOptimizerConfig>) {
    commit({ ...factory.optimizer, ...patch });
  }

  function addAvailablePart(slug: string) {
    update({
      availableParts: [...config.availableParts, { partSlug: slug, rate: 0 }],
    });
  }

  function updateAvailablePartRate(slug: string, rate: number | undefined) {
    update({
      availableParts: config.availableParts.map((p) =>
        p.partSlug === slug ? { ...p, rate: rate ?? 0 } : p,
      ),
    });
  }

  function updateAvailablePartHardLimit(slug: string, hardLimit: boolean) {
    update({
      availableParts: config.availableParts.map((p) =>
        p.partSlug === slug ? { ...p, hardLimit } : p,
      ),
    });
  }

  function removeAvailablePart(slug: string) {
    update({
      availableParts: config.availableParts.filter((p) => p.partSlug !== slug),
    });
  }

  const partExclusions = config.availableParts.map((p) => p.partSlug);

  return (
    <div>
      <p className="text-md mt-4 mb-1">Available parts</p>
      {config.availableParts.length === 0 && (
        <p className="text-sm text-gray-400 mb-1">
          Add parts already produced elsewhere to prefer them.
        </p>
      )}
      {config.availableParts.map((ap) => {
        const part = partSlugLookup[ap.partSlug];
        if (!part) return null;
        return (
          <div
            key={ap.partSlug}
            className="flex flex-row items-center gap-x-2 mb-2"
          >
            <Icon src={part.iconSmall} alt={part.name} size={24} />
            <span className="text-sm grow">{part.name}</span>
            <TextCalculatorField
              variant="outlined"
              size="small"
              label="Available /min"
              className="w-32"
              value={ap.rate}
              allowClear
              onCalculate={(v) => updateAvailablePartRate(ap.partSlug, v)}
              onClear={() => updateAvailablePartRate(ap.partSlug, undefined)}
            />
            <Tooltip title="Only this supply is used; the optimizer won't produce more of this part.">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={ap.hardLimit ?? false}
                    onChange={(_, v) =>
                      updateAvailablePartHardLimit(ap.partSlug, v)
                    }
                  />
                }
                label={<span className="text-xs">Hard limit</span>}
                className="m-0"
              />
            </Tooltip>
            <IconButton
              aria-label="Remove available part"
              title=""
              onClick={() => removeAvailablePart(ap.partSlug)}
              className="p-1"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        );
      })}
      <AddItemControl
        label="Add available part"
        triggerClassName="flex flex-row items-center p-1 mt-1"
        className="mt-2"
      >
        {(close) => (
          <PartSelector
            existingParts={partExclusions}
            onPartSelected={(part) => {
              addAvailablePart(part.slug);
              close();
            }}
          />
        )}
      </AddItemControl>
    </div>
  );
}
