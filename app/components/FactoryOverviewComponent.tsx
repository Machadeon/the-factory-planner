"use client";

import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import { useMemo, useState } from "react";
import type Factory from "../models/factory";
import type { ScoringObjective } from "../models/factory";
import {
  deserializeFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import { partSlugLookup } from "../models/library";
import { displayNum } from "../utils";
import Clickable from "./Clickable";
import ConstraintsDialog from "./ConstraintsDialog";
import { HorizontalDivider } from "./Dividers";
import PartRateSummary from "./PartRateSummary";
import RecipeOptimizerOptionsDialog from "./RecipeOptimizerOptionsDialog";

const OBJECTIVE_LABELS: Record<ScoringObjective, string> = {
  minResources: "Min resources",
  sinkPoints: "Max sink points",
  power: "Min power",
  buildings: "Min buildings",
  logistics: "Min logistics",
  inputValue: "Min input value",
};

interface FactoryOverviewComponentProps {
  factory: Factory;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
  onNavigateToFactory?: (id: string) => void;
  onRebuild?: () => void;
}

export default function FactoryOverviewComponent({
  factory,
  library,
  currentFactoryId,
  onNavigateToFactory,
}: FactoryOverviewComponentProps) {
  const [showOutputs, setShowOutputs] = useState(true);
  const [showInputs, setShowInputs] = useState(true);
  const [showIntermediates, setShowIntermediates] = useState(false);
  const [showConsumers, setShowConsumers] = useState(true);
  const [showPower, setShowPower] = useState(true);
  const [showSuppliers, setShowSuppliers] = useState(true);
  const [showConstraints, setShowConstraints] = useState(true);
  const [showConstraintsDialog, setShowConstraintsDialog] = useState(false);
  const [showRecipeOptimizer, setShowRecipeOptimizer] = useState(true);
  const [showRecipeOptimizerDialog, setShowRecipeOptimizerDialog] =
    useState(false);
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

  function _schedule(obj: object, fn: () => void) {
    setTimeout(fn.bind(obj), 1);
  }

  const factoryOutputs = factory.getOutputInfo().sort((a, b) => {
    const primaryDiff = (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
    return primaryDiff !== 0
      ? primaryDiff
      : a.part.name.localeCompare(b.part.name);
  });
  const factoryInputs = factory
    .allInputs()
    .sort((a, b) => a.name.localeCompare(b.name));
  const intermediateParts = factory.allIntermediateParts();

  // For each output part, find consumer factories (those that list currentFactoryId as a supplier)
  // and how much of that part they consume. Deserializing consumer factories is
  // expensive, so memoize: it only depends on the library, this factory's id,
  // and the set of output part slugs (recomputed when any of those change).
  const outputSlugKey = factoryOutputs.map((o) => o.part.slug).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: factoryOutputs is intentionally tracked via its slug signature (outputSlugKey) rather than its unstable array identity.
  const consumersByPartSlug = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rate: number }[]>();
    if (currentFactoryId && library) {
      for (const sf of library.factories) {
        if (!sf.supplierIds?.includes(currentFactoryId)) continue;
        const consumerFactory = deserializeFactory(sf, library);
        if (!consumerFactory) continue;
        for (const output of factoryOutputs) {
          const rate = consumerFactory.rateLookup[output.part.slug];
          if (!rate) continue;
          const net = rate.consumptionRate - rate.productionRate;
          if (net <= 0.0001) continue;
          const existing = map.get(output.part.slug) ?? [];
          existing.push({ id: sf.id, name: sf.name, rate: net });
          map.set(output.part.slug, existing);
        }
      }
    }
    return map;
  }, [library, currentFactoryId, outputSlugKey]);
  const hasConsumers = consumersByPartSlug.size > 0;

  return (
    <div className="flex flex-col w-xs">
      <div className="flex flex-row items-center mb-2">
        <span className="text-lg grow">Outputs ({factoryOutputs.length})</span>
        <Clickable
          onClick={() => setShowOutputs(!showOutputs)}
          className="inline"
        >
          {showOutputs ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </Clickable>
      </div>
      <div style={{ contentVisibility: showOutputs ? "visible" : "hidden" }}>
        {factoryOutputs.map((output, idx) => (
          <div key={output.part.slug}>
            {!output.isPrimary &&
              (idx === 0 || factoryOutputs[idx - 1].isPrimary) && (
                <div className="text-sm text-gray-400 py-2 mt-2">
                  Byproducts
                </div>
              )}
            <PartRateSummary
              part={output.part}
              rate={output.rate}
              factory={factory}
              library={library}
              currentFactoryId={currentFactoryId}
              highlight={!output.isPrimary}
            />
          </div>
        ))}
      </div>
      {hasConsumers && (
        <>
          <HorizontalDivider />
          <div className="flex flex-row items-center mb-2">
            <span className="text-lg grow">Consumers</span>
            <Clickable
              onClick={() => setShowConsumers(!showConsumers)}
              className="inline"
            >
              {showConsumers ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </Clickable>
          </div>
          <div
            style={{ contentVisibility: showConsumers ? "visible" : "hidden" }}
          >
            {factoryOutputs.map((output) => {
              const consumers = consumersByPartSlug.get(output.part.slug);
              if (!consumers || consumers.length === 0) return null;
              const totalConsumed = consumers.reduce((s, c) => s + c.rate, 0);
              const produced =
                output.rate.productionRate - output.rate.consumptionRate;
              const unused = produced - totalConsumed;
              const pct =
                produced > 0
                  ? Math.min(100, (totalConsumed / produced) * 100)
                  : 0;
              const overAllocated = totalConsumed > produced + 0.05;
              return (
                <div key={output.part.slug} className="mb-3">
                  <div className="flex flex-row items-center gap-x-1 mb-1">
                    <Image
                      src={output.part.iconSmall}
                      alt={output.part.name}
                      width={24}
                      height={24}
                    />
                    <span className="grow font-medium text-sm">
                      {output.part.name}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded bg-gray-700 mb-1 overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${overAllocated ? "bg-red-500" : "bg-blue-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs mb-1">
                    <span className="text-gray-400">
                      {displayNum(totalConsumed)}/{displayNum(produced)}/min
                      consumed
                    </span>
                    {overAllocated ? (
                      <span className="text-red-400">
                        {" "}
                        · {displayNum(totalConsumed - produced)}/min unfulfilled
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        {" "}
                        · {displayNum(unused)}/min unused
                      </span>
                    )}
                  </div>
                  {consumers.map((c) => (
                    <div
                      key={c.name}
                      className="flex flex-row items-center gap-x-1 pl-1 py-0.5"
                    >
                      {onNavigateToFactory ? (
                        <button
                          type="button"
                          className="grow text-sm text-left underline cursor-pointer hover:opacity-70"
                          onClick={() => onNavigateToFactory(c.id)}
                        >
                          {c.name}
                        </button>
                      ) : (
                        <span className="grow text-sm">{c.name}</span>
                      )}
                      <span className="text-sm text-right">
                        {displayNum(c.rate)}/min
                      </span>
                      <span className="text-xs text-gray-400 text-right min-w-10">
                        {produced > 0
                          ? `${displayNum((c.rate / produced) * 100)}%`
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
      <HorizontalDivider />
      <div className="flex flex-row items-center mb-2">
        <span className="text-lg grow">Inputs ({factoryInputs.length})</span>
        <Clickable
          onClick={() => setShowInputs(!showInputs)}
          className="inline"
        >
          {showInputs ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </Clickable>
      </div>
      <div style={{ contentVisibility: showInputs ? "visible" : "hidden" }}>
        {factoryInputs.map((part) => (
          <PartRateSummary
            key={part.slug}
            part={part}
            rate={factory.rateLookup[part.slug]}
            factory={factory}
            library={library}
            currentFactoryId={currentFactoryId}
          />
        ))}
      </div>
      <HorizontalDivider />
      <div className="flex flex-row items-center mb-2">
        <span className="text-lg grow">
          Intermediate Parts ({intermediateParts.length})
        </span>
        <Clickable
          onClick={() => setShowIntermediates(!showIntermediates)}
          className="inline"
        >
          {showIntermediates ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </Clickable>
      </div>
      <div
        style={{ contentVisibility: showIntermediates ? "visible" : "hidden" }}
      >
        {intermediateParts
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((part) => (
            <PartRateSummary
              key={part.slug}
              part={part}
              rate={factory.rateLookup[part.slug]}
              factory={factory}
              library={library}
              currentFactoryId={currentFactoryId}
              showDetail
            />
          ))}
      </div>
      {(() => {
        const totalPower = factory.getTotalPower();
        const totalShards = Math.round(factory.getTotalShards());
        const totalSloops = Math.round(factory.getTotalSloops());
        const variable = totalPower.max - totalPower.min > 0.01;
        return (
          <>
            <HorizontalDivider />
            <div className="flex flex-row items-center mb-2">
              <span className="text-lg grow">Power & Modules</span>
              <Clickable
                onClick={() => setShowPower(!showPower)}
                className="inline"
              >
                {showPower ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </Clickable>
            </div>
            <div
              style={{ contentVisibility: showPower ? "visible" : "hidden" }}
            >
              <div className="flex flex-row items-center gap-x-2 mb-1">
                <Image
                  src="/images/items/power_192.png"
                  alt="Power"
                  width={24}
                  height={24}
                />
                {variable ? (
                  <span className="text-sm">
                    {displayNum(totalPower.avg)} MW avg
                    <span className="text-gray-400">
                      {" "}
                      · {displayNum(totalPower.min)}–
                      {displayNum(totalPower.max)} MW
                    </span>
                  </span>
                ) : (
                  <span className="text-sm">
                    {displayNum(totalPower.avg)} MW
                  </span>
                )}
              </div>
              <div className="flex flex-row items-center gap-x-2 mb-1">
                <Image
                  src="/images/items/desc-crystalshard-c_64.png"
                  alt=""
                  width={24}
                  height={24}
                />
                <span className="text-sm">{totalShards} Power Shards</span>
              </div>
              <div className="flex flex-row items-center gap-x-2 mb-2">
                <Image
                  src="/images/items/Somersloop.png"
                  alt=""
                  width={24}
                  height={24}
                />
                <span className="text-sm">{totalSloops} Somersloops</span>
              </div>
            </div>
          </>
        );
      })()}
      <HorizontalDivider />
      <div className="flex flex-row items-center mb-2">
        <span className="text-lg grow">
          Constraints ({factory.constraints.length})
        </span>
        <Clickable
          onClick={() => setShowConstraints(!showConstraints)}
          className="inline"
        >
          {showConstraints ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </Clickable>
      </div>
      <div
        style={{ contentVisibility: showConstraints ? "visible" : "hidden" }}
      >
        {factory.constraints.length === 0 ? (
          <p className="text-sm text-gray-400 mb-2">No constraints set.</p>
        ) : (
          factory.constraints
            .sort((a, b) =>
              partSlugLookup[a.partSlug].name.localeCompare(
                partSlugLookup[b.partSlug].name,
              ),
            )
            .map((constraint) => {
              const part = partSlugLookup[constraint.partSlug];
              if (!part) return null;
              const parts: string[] = [];
              if (constraint.min !== undefined)
                parts.push(`min ${displayNum(constraint.min)}/min`);
              if (constraint.max !== undefined)
                parts.push(`max ${displayNum(constraint.max)}/min`);
              return (
                <div
                  key={constraint.partSlug}
                  className="flex flex-row items-center gap-x-2 mb-1"
                >
                  <Image
                    src={part.iconSmall}
                    alt={part.name}
                    width={24}
                    height={24}
                  />
                  <span className="text-sm grow">{part.name}</span>
                  <span className="text-sm text-gray-400">
                    {parts.join(", ")}
                  </span>
                </div>
              );
            })
        )}
        <Clickable
          onClick={() => setShowConstraintsDialog(true)}
          className="flex flex-row items-center p-1"
        >
          <EditIcon fontSize="small" />
          <span className="text-sm ml-1">Edit constraints</span>
        </Clickable>
      </div>
      <ConstraintsDialog
        open={showConstraintsDialog}
        onClose={() => setShowConstraintsDialog(false)}
        factory={factory}
        onApply={() => {}}
      />
      <HorizontalDivider />
      <div className="flex flex-row items-center mb-2">
        <span className="text-lg grow">Recipe Optimizer</span>
        <Clickable
          onClick={() => setShowRecipeOptimizer(!showRecipeOptimizer)}
          className="inline"
        >
          {showRecipeOptimizer ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </Clickable>
      </div>
      <div
        style={{
          contentVisibility: showRecipeOptimizer ? "visible" : "hidden",
        }}
      >
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
        <div className="flex flex-row items-center gap-x-2">
          <Clickable
            onClick={() => setShowRecipeOptimizerDialog(true)}
            className="flex flex-row items-center p-1"
          >
            <AutoFixHighIcon fontSize="small" />
            <span className="text-sm ml-1">Configure</span>
          </Clickable>
          <Clickable
            onClick={() => {
              factory.optimizeRecipes();
              factory.update();
            }}
            className="flex flex-row items-center p-1"
          >
            <PlayArrowIcon fontSize="small" />
            <span className="text-sm ml-1">Optimize recipes</span>
          </Clickable>
        </div>
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
      <RecipeOptimizerOptionsDialog
        open={showRecipeOptimizerDialog}
        onClose={() => setShowRecipeOptimizerDialog(false)}
        factory={factory}
        onApply={() => {}}
        library={library}
        currentFactoryId={currentFactoryId}
      />
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
      {factory.supplierFactories.length > 0 && (
        <>
          <HorizontalDivider />
          <div className="flex flex-row items-center mb-2">
            <span className="text-lg grow">
              Suppliers ({factory.supplierFactories.length})
            </span>
            <Clickable
              onClick={() => setShowSuppliers(!showSuppliers)}
              className="inline"
            >
              {showSuppliers ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </Clickable>
          </div>
          <div
            style={{ contentVisibility: showSuppliers ? "visible" : "hidden" }}
          >
            {factory.supplierFactories.map((fr) => {
              const suppliedParts = fr.products.filter((rp) => {
                const demand = factory.rateLookup[rp.part.slug];
                return demand && demand.consumptionRate > demand.productionRate;
              });
              return (
                <div key={fr.slug} className="mb-3">
                  <div className="flex flex-row items-center gap-x-1 mb-1">
                    {fr.icon && (
                      <Image
                        src={fr.icon}
                        alt={fr.name}
                        width={24}
                        height={24}
                      />
                    )}
                    {onNavigateToFactory ? (
                      <button
                        type="button"
                        className="grow font-medium text-left underline cursor-pointer hover:opacity-70"
                        onClick={() =>
                          onNavigateToFactory(fr.slug.replace("factory:", ""))
                        }
                      >
                        {fr.name}
                      </button>
                    ) : (
                      <span className="grow font-medium">{fr.name}</span>
                    )}
                    <Tooltip title="Remove supplier">
                      <span>
                        <Clickable
                          onClick={() =>
                            factory.removeSupplier(
                              fr.slug.replace("factory:", ""),
                            )
                          }
                          className="inline p-1"
                        >
                          <DeleteIcon fontSize="small" />
                        </Clickable>
                      </span>
                    </Tooltip>
                  </div>
                  {suppliedParts.length === 0 ? (
                    <div className="text-sm text-gray-400 pl-1">
                      No parts currently demanded
                    </div>
                  ) : (
                    suppliedParts.map((rp) => {
                      const demand = factory.rateLookup[rp.part.slug];
                      const demanded =
                        demand.consumptionRate - demand.productionRate;
                      return (
                        <div
                          key={rp.part.slug}
                          className="flex flex-row items-center gap-x-1 pl-4 py-0.5"
                        >
                          <Image
                            src={rp.part.iconSmall}
                            alt={rp.part.name}
                            width={24}
                            height={24}
                            className="shrink-0"
                          />
                          <span className="grow text-sm">{rp.part.name}</span>
                          <span className="text-sm text-right whitespace-nowrap">
                            {displayNum(demanded)} of {displayNum(rp.quantity)}
                            /min
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
