"use client";

import TuneIcon from "@mui/icons-material/Tune";
import { useState } from "react";
import { useFactory } from "@/app/contexts/FactoryContext";
import { buildings, recipes } from "../../models/game-data";
import {
  MAX_GAME_PHASE,
  type RecipeOptimizerConfig,
  setRecipesEnabled,
  toggleBuilding,
  toggleCategory,
  updatePhase,
} from "../../models/optimizer-config";
import ActionRow from "../ui/ActionRow";
import Icon from "../ui/Icon";
import Select from "../ui/Select";
import Switch from "../ui/Switch";
import RecipeListPanel from "./RecipeListPanel";

// Buildings that actually run craftable recipes, grouped by menuGroup/menuGroupIndex.
const recipeBuildings = buildings
  .filter((b) => recipes.some((r) => r.building.slug === b.slug))
  .sort((a, b) => {
    if (a.menuGroup !== b.menuGroup)
      return a.menuGroup.localeCompare(b.menuGroup);
    return a.menuGroupIndex - b.menuGroupIndex;
  });

const GROUP_ORDER: Record<string, number> = {
  factory: 0,
  smelter: 1,
  refinery: 2,
  generator: 3,
};
const GROUP_LABEL: Record<string, string> = {
  factory: "Factories",
  smelter: "Smelters",
  refinery: "Refineries",
  generator: "Generators",
};

const recipeBuildingGroups = recipeBuildings
  .reduce<{ group: string; buildings: (typeof recipeBuildings)[0][] }[]>(
    (acc, b) => {
      const last = acc[acc.length - 1];
      if (last && last.group === b.menuGroup) last.buildings.push(b);
      else acc.push({ group: b.menuGroup, buildings: [b] });
      return acc;
    },
    [],
  )
  .sort((a, b) => (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99));

// Recipe/phase/category/building filters, lifted out of the former
// RecipeOptimizerPanel. Live-write: edits write straight to factory.optimizer.
export default function OptimizerRecipeFilters() {
  const factory = useFactory();
  const [showRecipeList, setShowRecipeList] = useState(false);

  const config = factory.optimizer;

  function commit(next: RecipeOptimizerConfig) {
    factory.setOptimizerConfig(next);
  }

  function update(patch: Partial<RecipeOptimizerConfig>) {
    commit({ ...factory.optimizer, ...patch });
  }

  function toggleRecipe(slug: string, enabled: boolean) {
    update({
      enabledRecipes: setRecipesEnabled(
        factory.optimizer.enabledRecipes,
        [slug],
        enabled,
      ),
    });
  }

  return (
    <div>
      {/* Tech / game phase filter */}
      <div className="flex flex-row text-lg">Recipe Filters</div>
      <div className="text-sm text-gray-400 mb-2">
        Filter recipes by game phase and other controls. Changing game phase
        will reset all recipe selections.
      </div>
      <div className="flex flex-row items-center gap-x-2 mt-2 mb-2">
        <span className="text-md w-28 shrink-0">Game phase</span>
        <Select
          size="small"
          value={`${config.phase}`}
          onChange={(v) => commit(updatePhase(factory.optimizer, Number(v)))}
          options={Array.from({ length: MAX_GAME_PHASE }, (_, i) => i + 1).map(
            (p) => ({ value: `${p}`, label: `Phase ${p}` }),
          )}
        />
      </div>
      <Switch
        checked={config.defaultRecipesEnabled}
        onChange={(v) =>
          commit(toggleCategory(factory.optimizer, "default", v))
        }
        label="Default recipes"
      />
      <Switch
        checked={config.alternateRecipesEnabled}
        onChange={(v) =>
          commit(toggleCategory(factory.optimizer, "alternate", v))
        }
        label="Alternate recipes"
      />
      <Switch
        disabled={!config.defaultRecipesEnabled}
        checked={
          config.defaultRecipesEnabled && config.oreConversionRecipesEnabled
        }
        onChange={(v) =>
          commit(toggleCategory(factory.optimizer, "oreConversion", v))
        }
        label="Ore conversion recipes"
      />

      {/* Buildings */}
      <p className="text-md mt-4">Buildings</p>
      <p className="text-sm mt-2 mb-2 text-gray-400">
        Enable or disable which buildings are allowed.
      </p>
      <div className="flex flex-row flex-wrap gap-x-6">
        {recipeBuildingGroups.map(({ group, buildings: groupBuildings }) => (
          <div key={group} className="flex flex-col">
            <p className="text-sm text-gray-400 mb-1">
              {GROUP_LABEL[group] ?? group}
            </p>
            {groupBuildings.map((building) => (
              <Switch
                key={building.slug}
                size="small"
                checked={config.buildingsEnabled.includes(building.slug)}
                disabled={config.phase < building.unlockPhase}
                onChange={(v) =>
                  commit(toggleBuilding(factory.optimizer, building.slug, v))
                }
                label={
                  <span className="flex flex-row items-center gap-x-1">
                    <Icon
                      src={building.iconSmall}
                      alt={building.name}
                      size={20}
                    />
                    <span className="text-sm">{building.name}</span>
                  </span>
                }
              />
            ))}
          </div>
        ))}
      </div>

      {/* Recipe management */}
      <p className="text-sm text-gray-400 mb-1 mt-4">
        {config.enabledRecipes.length} of {recipes.length} recipes enabled. The
        controls above are helpers; fine-tune individual recipes here.
      </p>
      <ActionRow
        onClick={() => setShowRecipeList((s) => !s)}
        aria-expanded={showRecipeList}
        className="flex flex-row items-center p-1 mt-1"
      >
        <TuneIcon fontSize="small" />
        <span className="text-sm ml-1">
          {showRecipeList ? "Hide recipes" : "Manage recipes"}
        </span>
      </ActionRow>
      {showRecipeList && (
        <div className="mt-2">
          <RecipeListPanel
            enabledRecipes={config.enabledRecipes}
            onToggle={toggleRecipe}
          />
        </div>
      )}
    </div>
  );
}
