"use client";

import { useFactory } from "@/app/contexts/FactoryContext";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import { useNavigation } from "@/app/contexts/NavigationContext";
import type Factory from "../models/factory";
import type { SerializedFactory } from "../models/factory-storage";
import type Part from "../models/part";
import { HorizontalDivider } from "./Dividers";
import PartSelector from "./PartSelector";
import ProductionLineComponent from "./ProductionLineComponent";
import AddItemControl from "./ui/AddItemControl";

interface PlanningSectionProps {
  candidateFactories: { sf: SerializedFactory; factory: Factory }[];
  forceExpanded: boolean | null;
  onToggle: () => void;
  onAddProduct: (part: Part) => void;
  onRemoveProduct: (part: Part) => void;
}

export default function PlanningSection({
  candidateFactories,
  forceExpanded,
  onToggle,
  onAddProduct,
  onRemoveProduct,
}: PlanningSectionProps) {
  const factory = useFactory();
  const { library, currentFactoryId } = useLibraryContext();
  const { navigateToFactory } = useNavigation();
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
              onNavigateToFactory={navigateToFactory}
            />
            <HorizontalDivider />
          </div>
        ))
      )}
      <AddItemControl
        label="Add product"
        triggerClassName="flex flex-row items-center p-1 mx-4 grow-x"
      >
        {(close) => (
          <PartSelector
            existingParts={factory.productionLines.map((p) => p.part.slug)}
            onPartSelected={(part) => {
              onAddProduct(part);
              close();
            }}
          />
        )}
      </AddItemControl>
    </div>
  );
}
