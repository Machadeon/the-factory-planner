"use client";

import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import type Factory from "../models/factory";
import type {
  SerializedFactory,
  StorageLibrary,
} from "../models/factory-storage";
import type Part from "../models/part";
import Clickable from "./Clickable";
import { HorizontalDivider } from "./Dividers";
import PartSelector from "./PartSelector";
import ProductionLineComponent from "./ProductionLineComponent";

interface PlanningSectionProps {
  factory: Factory;
  library: StorageLibrary;
  currentFactoryId: string | null;
  candidateFactories: { sf: SerializedFactory; factory: Factory }[];
  forceExpanded: boolean | null;
  onToggle: () => void;
  onAddProduct: (part: Part) => void;
  onRemoveProduct: (part: Part) => void;
  onNavigateToFactory: (id: string) => void;
}

export default function PlanningSection({
  factory,
  library,
  currentFactoryId,
  candidateFactories,
  forceExpanded,
  onToggle,
  onAddProduct,
  onRemoveProduct,
  onNavigateToFactory,
}: PlanningSectionProps) {
  const [addingProduct, setAddingProduct] = useState(false);

  return (
    <div className="flex flex-col grow">
      {factory.productionLines.length === 0 ? (
        <p className="p-4 pb-1 text-gray-400 text-sm">
          Add a product to manually select recipes and rates
        </p>
      ) : (
        factory.productionLines.map((product) => (
          <div key={product.part.slug}>
            <ProductionLineComponent
              productionLine={product}
              factory={factory}
              library={library}
              currentFactoryId={currentFactoryId}
              candidateFactories={candidateFactories}
              onDeleteClicked={() => onRemoveProduct(product.part)}
              forceExpanded={forceExpanded}
              onToggle={onToggle}
              onNavigateToFactory={onNavigateToFactory}
            />
            <HorizontalDivider />
          </div>
        ))
      )}
      {addingProduct ? (
        <PartSelector
          existingParts={factory.productionLines.map((p) => p.part.slug)}
          onPartSelected={(part) => {
            onAddProduct(part);
            setAddingProduct(false);
          }}
          onBlur={() => setAddingProduct(false)}
        />
      ) : (
        <Clickable
          className="flex flex-row items-center p-1 mx-4 grow-x"
          onClick={() => setAddingProduct(true)}
        >
          <AddIcon fontSize="small" />
          <span className="text-sm ml-1">Add product</span>
        </Clickable>
      )}
    </div>
  );
}
