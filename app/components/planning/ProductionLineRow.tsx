"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkIcon from "@mui/icons-material/Link";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import type { MouseEvent } from "react";
import { displayNum, rateUnit } from "@/app/lib/format";
import { rateStatusColor } from "@/app/lib/rate-status";
import type Part from "../../models/part";
import type ProductionLine from "../../models/production-line";
import ActionRow from "../ui/ActionRow";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import {
  type InteractiveVariant,
  rowVisualClasses,
} from "../ui/interactive-styles";
import RateDisplay, { type RateStatus } from "../ui/RateDisplay";
import TextCalculatorField from "../ui/TextCalculatorField";
import TextField from "../ui/TextField";
import SuggestedActions from "./SuggestedActions";

interface ProductionLineRowProps {
  productionLine: ProductionLine;
  part: Part;
  isExpanded: boolean;
  productionRateDiff: number;
  outputRateDisplay: number;
  actualProductionRate: number;
  onToggleExpand: () => void;
  onUpdateOutputRate: (newValue: number) => void;
  onUpdateProductionRate: (newValue: number) => void;
  onToggleAutoCalculateRate: (e: MouseEvent<HTMLButtonElement>) => void;
  onToggleMaximizeOutput: (e: MouseEvent<HTMLButtonElement>) => void;
  onAcceptLine: (e: MouseEvent<HTMLButtonElement>) => void;
  onRejectLine: (e: MouseEvent<HTMLButtonElement>) => void;
  onRemoveSelf: (e: MouseEvent<HTMLButtonElement>) => void;
}

export default function ProductionLineRow({
  productionLine,
  part,
  isExpanded,
  productionRateDiff,
  outputRateDisplay,
  actualProductionRate,
  onToggleExpand,
  onUpdateOutputRate,
  onUpdateProductionRate,
  onToggleAutoCalculateRate,
  onToggleMaximizeOutput,
  onAcceptLine,
  onRejectLine,
  onRemoveSelf,
}: ProductionLineRowProps) {
  const unit = rateUnit(part);

  const isSlooped = productionLine.assemblyLines.some((al) => al.isSlooped());
  const baseProductionRateColorClass = rateStatusColor(productionRateDiff, {
    surplusIsGood: false,
  });
  const actualProductionRateTextColorClass =
    isSlooped && baseProductionRateColorClass === "text-green-500"
      ? "text-pink-600"
      : baseProductionRateColorClass;
  const actualProductionRateStatus: RateStatus =
    actualProductionRateTextColorClass === "text-red-500"
      ? "deficit"
      : actualProductionRateTextColorClass === "text-amber-500"
        ? "surplus"
        : actualProductionRateTextColorClass === "text-pink-600"
          ? "slooped"
          : "balanced";
  let productionRateDiffStr: string;
  if (actualProductionRateTextColorClass === "text-amber-500") {
    productionRateDiffStr = ` (+${displayNum(productionRateDiff)})`;
  } else if (actualProductionRateTextColorClass === "text-red-500") {
    productionRateDiffStr = ` (${displayNum(productionRateDiff)})`;
  } else {
    productionRateDiffStr = "";
  }

  let mainStyle: InteractiveVariant = "default";
  if (productionLine.assemblyLines.every((al) => al.rate < 0)) {
    mainStyle = "danger";
  } else if (!productionLine.assemblyLines.every((al) => al.rate > 0)) {
    mainStyle = "warning";
  }
  return (
    <div
      className={rowVisualClasses(
        mainStyle,
        "flex flex-row items-center gap-x-2 px-4 py-2",
      )}
    >
      <ActionRow
        bare
        aria-expanded={isExpanded}
        aria-label={`${part.name} production line`}
        onClick={onToggleExpand}
        className="flex flex-row items-center gap-x-2 grow"
      >
        {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        <div className="flex flex-row items-center gap-2 w-sm flex-none">
          <Icon src={part.iconSmall} label={part.name} size={64} />
          <span className="text-xl">{part.name}</span>
        </div>
        <span>
          Actual:{" "}
          <RateDisplay
            part={part}
            rate={actualProductionRate}
            colorClass={actualProductionRateTextColorClass}
            status={actualProductionRateStatus}
            className="font-bold"
          />
          <span className={`font-bold ${actualProductionRateTextColorClass}`}>
            {productionRateDiffStr}
          </span>
        </span>
      </ActionRow>
      {productionLine.autoCreated && (
        <SuggestedActions onAccept={onAcceptLine} onReject={onRejectLine} />
      )}
      <div className="flex flex-row items-center w-sm flex-none gap-x-2">
        {productionLine.maximizeOutput ? (
          <TextField
            size="small"
            label="Factory Output Rate"
            className="w-40"
            inputClassName="text-right"
            disabled
            value={outputRateDisplay}
          />
        ) : (
          <TextCalculatorField
            size="small"
            label="Factory Output Rate"
            className="w-40"
            inputClassName="text-right"
            value={outputRateDisplay}
            onCalculate={onUpdateOutputRate}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {productionLine.autoCalculateRate ? (
          <TextField
            size="small"
            label="Production Rate"
            className="w-32"
            inputClassName="text-right"
            disabled
            value={productionLine.rate}
          />
        ) : (
          <TextCalculatorField
            size="small"
            label="Production Rate"
            className="w-32"
            inputClassName="text-right"
            value={productionLine.rate}
            onCalculate={onUpdateProductionRate}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <span>{unit}</span>
        {productionLine.autoCalculateRate ? (
          <IconButton
            aria-label="Override rate"
            onClick={onToggleAutoCalculateRate}
            className="p-1"
          >
            <EditIcon />
          </IconButton>
        ) : (
          <IconButton
            aria-label="Autocalculate rate"
            onClick={onToggleAutoCalculateRate}
            className="p-1"
          >
            <LinkIcon />
          </IconButton>
        )}
        <IconButton
          aria-label={
            productionLine.maximizeOutput
              ? "Stop maximizing output"
              : "Maximize output (limited by constraints)"
          }
          onClick={onToggleMaximizeOutput}
          className="p-1"
        >
          <TrendingUpIcon
            className={
              productionLine.maximizeOutput
                ? "text-amber-500!"
                : "text-gray-400!"
            }
          />
        </IconButton>
      </div>
      <IconButton
        aria-label="Remove product"
        onClick={onRemoveSelf}
        className="p-1"
      >
        <DeleteIcon />
      </IconButton>
    </div>
  );
}
