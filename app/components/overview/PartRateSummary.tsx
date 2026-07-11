"use client";

import AddIcon from "@mui/icons-material/Add";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import { useState } from "react";
import { useFactory } from "@/app/contexts/FactoryContext";
import { displayNum } from "@/app/lib/format";
import type Factory from "../../models/factory";
import type { Rate } from "../../models/factory";
import FactoryRecipe from "../../models/factory-recipe";
import { RATE_EPSILON } from "../../models/game-data";
import type Part from "../../models/part";
import FactoryPickerDialog from "../FactoryPickerDialog";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import RateDisplay from "../ui/RateDisplay";

interface PartRateSummaryProps {
  part: Part;
  rate: Rate;
  showDetail?: boolean;
  hideActions?: boolean;
  highlight?: boolean;
}

export default function PartRateSummary({
  part,
  rate,
  showDetail,
  hideActions,
  highlight,
}: PartRateSummaryProps) {
  const factory = useFactory();
  const [supplyPickerOpen, setSupplyPickerOpen] = useState(false);
  const netRate = rate.productionRate - rate.consumptionRate;
  const netRateDisplay = displayNum(
    Math.abs(netRate) < RATE_EPSILON ? rate.productionRate : Math.abs(netRate),
  );

  // Get producers and consumers for this part
  const assemblyLines = factory._assemblyLineLookup[part.slug] || [];
  const producers = assemblyLines.filter(
    (line) =>
      line.rate > RATE_EPSILON &&
      line.recipe.products.some((p) => p.part.slug === part.slug),
  );
  const consumers = assemblyLines.filter(
    (line) =>
      line.rate > RATE_EPSILON &&
      line.recipe.ingredients.some((p) => p.part.slug === part.slug),
  );

  function handleAddSupplier(id: string, name: string, f: Factory) {
    factory.addSupplier(new FactoryRecipe(id, name, f));
    setSupplyPickerOpen(false);
  }

  return (
    <div>
      <div
        className={`items-center flex flex-row gap-x-1 py-0.5 ${highlight ? "text-amber-500" : ""}`}
      >
        <Icon
          src={part.iconSmall}
          alt={part.name}
          size={24}
          className="inline flex-none"
        />
        <span className="grow text-sm">{part.name}</span>
        <RateDisplay
          part={part}
          rate={
            Math.abs(netRate) < RATE_EPSILON
              ? rate.productionRate
              : Math.abs(netRate)
          }
          className="text-sm text-right min-w-16"
        />
        {netRate < 0 && !hideActions && !showDetail && (
          <>
            <IconButton
              aria-label="Add production line"
              onClick={() => factory.addProductionLine(part)}
              className="inline p-0.5"
            >
              <AddIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="Supply from factory"
              onClick={() => setSupplyPickerOpen(true)}
              className="inline p-0.5"
            >
              <WarehouseIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </div>
      {showDetail && netRateDisplay !== "0" && (
        <div className="flex flex-col gap-y-1 pl-7 text-xs text-gray-700 dark:text-gray-300">
          <div>Produced by:</div>
          <ul>
            {producers.map((line) => {
              const recipePart = line.recipe.products.find(
                (p) => p.part.slug === part.slug,
              );
              const productRate =
                recipePart && line.rate > 0
                  ? recipePart.quantity * line.rate
                  : 0;
              return (
                <li key={line.recipe.slug} className="pl-2">
                  {line.recipe.name} @ {displayNum(productRate)}/min
                </li>
              );
            })}
          </ul>
          <div>
            <div>Consumed by:</div>
            <ul>
              {consumers.map((line) => {
                const recipePart = line.recipe.ingredients.find(
                  (p) => p.part.slug === part.slug,
                );
                const consumeRate =
                  recipePart && line.rate > 0
                    ? recipePart.quantity * line.rate
                    : 0;
                return (
                  <li key={line.recipe.slug} className="pl-2">
                    {line.recipe.name} @ {displayNum(consumeRate)}/min
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      <FactoryPickerDialog
        open={supplyPickerOpen}
        mode="supplier"
        targetPartSlug={part.slug}
        onPick={handleAddSupplier}
        onClose={() => setSupplyPickerOpen(false)}
      />
    </div>
  );
}
