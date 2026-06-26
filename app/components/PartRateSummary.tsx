"use client";

import AddIcon from "@mui/icons-material/Add";
import Clickable from "./Clickable";
import Part from "../models/part";
import { Rate } from "../models/factory";
import Factory from "../models/factory";
import Image from "next/image";
import { displayNum, getColorClassForProductionRate2 } from "../utils";

interface PartRateSummaryProps {
  part: Part;
  rate: Rate;
  factory: Factory;
}

export default function PartRateSummary({
  part,
  rate,
  factory,
}: PartRateSummaryProps) {
  const totalRate =
    (rate && displayNum(rate.productionRate - rate.consumpionRate)) || 0;
  const totalRatePrefix = totalRate < 0 ? "" : "+";

  return (
    <div>
      <div className="items-center flex flex-row gap-x-1">
        <Image
          src={part.iconSmall}
          alt={part.name}
          width={32}
          height={32}
          className="inline"
        />{" "}
        <span className="grow">{part.name}</span>
        {totalRate < 0 && (
          <Clickable
            onClick={() => factory.addProductionLine(part)}
            className="inline p-1"
          >
            <AddIcon />
          </Clickable>
        )}
      </div>
      <div className="flex flex-row gap-x-1">
        <div className="grow"></div>
        <span className="min-w-16 text-right">
          +{displayNum(rate?.productionRate || 0)}
        </span>
        <span className="min-w-16 text-right">
          - {displayNum(rate?.consumpionRate || 0)}
        </span>
        <span>=</span>
        <span
          className={`min-w-16 text-right ${getColorClassForProductionRate2(totalRate)}`}
        >
          {totalRatePrefix}
          {totalRate}
        </span>
      </div>
    </div>
  );
}
