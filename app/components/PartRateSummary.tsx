"use client";

import AddIcon from "@mui/icons-material/Add";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import { useState } from "react";
import type Factory from "../models/factory";
import type { Rate } from "../models/factory";
import FactoryRecipe from "../models/factory-recipe";
import type { StorageLibrary } from "../models/factory-storage";
import type Part from "../models/part";
import { displayNum, getColorClassForProductionRate2 } from "../utils";
import Clickable from "./Clickable";
import FactoryPickerDialog from "./FactoryPickerDialog";

interface PartRateSummaryProps {
  part: Part;
  rate: Rate;
  factory: Factory;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
  showDetail?: boolean;
}

export default function PartRateSummary({
  part,
  rate,
  factory,
  library,
  currentFactoryId,
  showDetail,
}: PartRateSummaryProps) {
  const [supplyPickerOpen, setSupplyPickerOpen] = useState(false);
  const netRate = rate ? rate.productionRate - rate.consumptionRate : 0;
  const netRateDisplay = displayNum(Math.abs(netRate));
  const sign = netRate >= 0 ? "+" : "-";

  function handleAddSupplier(id: string, name: string, f: Factory) {
    factory.addSupplier(new FactoryRecipe(id, name, f));
    setSupplyPickerOpen(false);
  }

  return (
    <div>
      <div className="items-center flex flex-row gap-x-1 py-0.5">
        <Image
          src={part.iconSmall}
          alt={part.name}
          width={24}
          height={24}
          className="inline flex-none"
        />
        <span className="grow text-sm">{part.name}</span>
        <span
          className={`text-sm text-right min-w-16 ${getColorClassForProductionRate2(netRate)}`}
        >
          {sign}
          {netRateDisplay}/min
        </span>
        {netRate < 0 && (
          <>
            <Tooltip title="Add production line">
              <span>
                <Clickable
                  onClick={() => factory.addProductionLine(part)}
                  className="inline p-0.5"
                >
                  <AddIcon fontSize="small" />
                </Clickable>
              </span>
            </Tooltip>
            {library && (
              <Tooltip title="Supply from factory">
                <span>
                  <Clickable
                    onClick={() => setSupplyPickerOpen(true)}
                    className="inline p-0.5"
                  >
                    <WarehouseIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
            )}
          </>
        )}
      </div>
      {showDetail && (
        <div className="flex flex-row gap-x-2 pl-7 text-xs text-gray-400">
          <span>+{displayNum(rate?.productionRate || 0)}</span>
          <span>−{displayNum(rate?.consumptionRate || 0)}</span>
        </div>
      )}
      {library && (
        <FactoryPickerDialog
          open={supplyPickerOpen}
          library={library}
          currentFactoryId={currentFactoryId ?? null}
          targetPartSlug={part.slug}
          onPick={handleAddSupplier}
          onClose={() => setSupplyPickerOpen(false)}
        />
      )}
    </div>
  );
}
