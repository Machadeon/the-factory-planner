"use client";

import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Button from "@mui/material/Button";
import { useState } from "react";
import type Factory from "../models/factory";
import Clickable from "./Clickable";
import { HorizontalDivider } from "./Dividers";
import PartRateSummary from "./PartRateSummary";

interface FactoryOverviewComponentProps {
  factory: Factory;
  onRebuild: () => void;
}

export default function FactoryOverviewComponent({
  factory,
  onRebuild,
}: FactoryOverviewComponentProps) {
  const [showIntermediateProducts, setShowIntermediateProducts] =
    useState<boolean>(false);

  function schedule(obj: object, fn: () => void) {
    setTimeout(fn.bind(obj), 1);
  }

  const factoryOutputs = factory.allOutputs();
  const factoryInputs = factory.allInputs();
  const intermediateParts = factory.allIntermediateParts();

  return (
    <div className="flex flex-col w-xs">
      <div className="text-lg mb-2">Controls</div>
      <div className="flex flex-col gap-y-2">
        <Button
          variant="contained"
          onClick={onRebuild}
        >
          Update
        </Button>
        <Button
          variant="contained"
          onClick={() => schedule(factory, factory.autoCalculateRates)}
        >
          Run Solver
        </Button>
      </div>
      <HorizontalDivider />
      <div className="text-lg mb-2">Outputs ({factoryOutputs.length})</div>
      {factoryOutputs.map((part) => (
        <PartRateSummary
          key={part.slug}
          part={part}
          rate={factory.rateLookup[part.slug]}
          factory={factory}
        />
      ))}
      <HorizontalDivider />
      <div className="text-lg mb-2">Inputs ({factoryInputs.length})</div>
      {factoryInputs.map((part) => (
        <PartRateSummary
          key={part.slug}
          part={part}
          rate={factory.rateLookup[part.slug]}
          factory={factory}
        />
      ))}
      <HorizontalDivider />
      <div className="flex flex-row items-center mb-2">
        <span className="text-lg grow">
          Intermediate Parts ({intermediateParts.length})
        </span>
        <Clickable
          onClick={() => setShowIntermediateProducts(!showIntermediateProducts)}
          className="inline"
        >
          {showIntermediateProducts ? (
            <VisibilityOffIcon />
          ) : (
            <VisibilityIcon />
          )}
        </Clickable>
      </div>
      {showIntermediateProducts &&
        intermediateParts.map((part) => (
          <PartRateSummary
            key={part.slug}
            part={part}
            rate={factory.rateLookup[part.slug]}
            factory={factory}
          />
        ))}
    </div>
  );
}
