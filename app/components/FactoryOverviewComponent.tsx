"use client";

import Factory from "../models/factory";
import PartRateSummary from "./PartRateSummary";
import { HorizontalDivider } from "./Dividers";
import Clickable from "./Clickable";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useState } from "react";


interface FactoryOverviewComponentProps {
  factory: Factory;
}

export default function FactoryOverviewComponent({
  factory,
}: FactoryOverviewComponentProps) {
  const [showIntermediateProducts, setShowIntermediateProducts] = useState<boolean>(false);

  return (
    <div className="flex flex-col w-xs">
      <p className="text-lg mb-2">Outputs</p>
      {factory.allOutputs().map((part) => (
        <PartRateSummary
          key={part.slug}
          part={part}
          rate={factory.rateLookup[part.slug]}
          factory={factory}
        />
      ))}
      <HorizontalDivider/>
      <p className="text-lg mb-2">Inputs</p>
      {factory.allInputs().map((part) => (
        <PartRateSummary
          key={part.slug}
          part={part}
          rate={factory.rateLookup[part.slug]}
          factory={factory}
        />
      ))}
      <HorizontalDivider/>
      <p className="flex flex-row items-center mb-2">
        <span className="text-lg grow">Intermediate Parts</span>
        <Clickable onClick={() => setShowIntermediateProducts(!showIntermediateProducts)} className="inline">
          {showIntermediateProducts ? <VisibilityOffIcon/> : <VisibilityIcon/>}
        </Clickable>
      </p>
      {showIntermediateProducts && factory.allIntermediateParts().map((part) => (
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
