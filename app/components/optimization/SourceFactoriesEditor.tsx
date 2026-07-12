"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import { useFactory } from "@/app/contexts/FactoryContext";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import { displayNum } from "@/app/lib/format";
import { availableOutputsFrom } from "../../models/factory-metrics";
import { deserializeFactory } from "../../models/factory-storage";
import type { RecipeOptimizerConfig } from "../../models/optimizer-config";
import AddItemControl from "../ui/AddItemControl";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";

// Source factory editor, lifted out of the former RecipeOptimizerPanel.
// Live-write: edits write straight to factory.optimizer.
export default function SourceFactoriesEditor() {
  const factory = useFactory();
  const { library, currentFactoryId } = useLibraryContext();
  const config = factory.optimizer;

  function commit(next: RecipeOptimizerConfig) {
    factory.setOptimizerConfig(next);
  }

  function update(patch: Partial<RecipeOptimizerConfig>) {
    commit({ ...factory.optimizer, ...patch });
  }

  function addSourceFactory(id: string) {
    if (!config.availableFactoryIds.includes(id)) {
      update({ availableFactoryIds: [...config.availableFactoryIds, id] });
    }
  }

  function removeSourceFactory(id: string) {
    update({
      availableFactoryIds: config.availableFactoryIds.filter((i) => i !== id),
    });
  }

  // Resolve selected source factories to their names + produced parts/rates.
  const sourceFactories = useMemo(() => {
    if (!library) return [];
    return config.availableFactoryIds.map((id) => {
      const sf = library.factories.find((f) => f.id === id);
      const f = sf ? deserializeFactory(sf, library) : null;
      const outputs = f ? availableOutputsFrom(f) : [];
      return { id, name: sf?.name ?? id, outputs };
    });
  }, [config.availableFactoryIds, library]);

  const factoryOptions = useMemo(() => {
    if (!library) return [];
    return library.factories
      .filter(
        (f) =>
          f.id !== currentFactoryId &&
          !config.availableFactoryIds.includes(f.id),
      )
      .map((f) => ({ label: f.name, id: f.id }));
  }, [library, currentFactoryId, config.availableFactoryIds]);

  return (
    <div>
      <p className="text-md mt-4 mb-1">Source factories</p>
      {sourceFactories.length === 0 && (
        <p className="text-sm text-gray-400 mb-1">
          Specify source factories to bring their outputs into the equation.
        </p>
      )}
      {sourceFactories.map((sf) => (
        <div key={sf.id} className="mb-2">
          <div className="flex flex-row items-center gap-x-2">
            <span className="text-sm grow">{sf.name}</span>
            <IconButton
              aria-label="Remove source factory"
              title=""
              onClick={() => removeSourceFactory(sf.id)}
              className="p-1"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
          {sf.outputs.map((o) => (
            <div
              key={o.part.slug}
              className="flex flex-row items-center gap-x-2 ml-2"
            >
              <Icon src={o.part.iconSmall} alt={o.part.name} size={20} />
              <span className="text-xs text-gray-400 grow">{o.part.name}</span>
              <span className="text-xs text-gray-400">
                {displayNum(o.rate)}/min
              </span>
            </div>
          ))}
        </div>
      ))}
      {library && factoryOptions.length > 0 && (
        <AddItemControl
          label="Add source factory"
          triggerClassName="flex flex-row items-center p-1 mt-1"
          className="mt-2"
        >
          {(close) => (
            <Autocomplete
              options={factoryOptions}
              openOnFocus
              blurOnSelect
              value={null}
              onChange={(_, option) => {
                if (option) {
                  addSourceFactory(option.id);
                  close();
                }
              }}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Add source factory"
                  autoFocus
                />
              )}
            />
          )}
        </AddItemControl>
      )}
    </div>
  );
}
