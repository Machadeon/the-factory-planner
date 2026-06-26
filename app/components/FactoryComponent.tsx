"use client";

import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import Factory from "../models/factory";
import type Part from "../models/part";
import Clickable from "./Clickable";
import { HorizontalDivider, VerticalDivider } from "./Dividers";
import FactoryOverviewComponent from "./FactoryOverviewComponent";
import PartSelector from "./PartSelector";
import ProductionLineComponent from "./ProductionLineComponent";

export default function FactoryComponent() {
  const [addingProduct, setAddingProduct] = useState<boolean>(false);

  const [factory, setFactory] = useState<Factory>(new Factory());
  factory.update = () => {
    setFactory(new Factory(factory));
  };

  function addProductionLine(part: Part) {
    factory.addProductionLine(part);
    setAddingProduct(false);
  }

  function removeProductionLine(part: Part) {
    factory.removeProductionLine(part);
  }

  return (
    <div className="flex flex-row min-w-full min-h-full grow">
      <div className="flex flex-col grow">
        {factory.productionLines.length === 0 ? (
          <>
            <p className="p-4">Add a product to get started</p>
            <HorizontalDivider />
          </>
        ) : (
          factory.productionLines.map((product) => (
            <div key={product.part.slug}>
              <ProductionLineComponent
                productionLine={product}
                factory={factory}
                onDeleteClicked={() => removeProductionLine(product.part)}
              />
              <HorizontalDivider />
            </div>
          ))
        )}
        {addingProduct ? (
          <PartSelector
            existingParts={factory.productionLines.map((p) => p.part.slug)}
            onPartSelected={addProductionLine}
          />
        ) : (
          <Clickable
            className="flex min-w-full items-center p-4"
            onClick={() => setAddingProduct(true)}
          >
            <AddIcon />
            Add Product
          </Clickable>
        )}
      </div>
      <VerticalDivider />
      <FactoryOverviewComponent factory={factory} />
    </div>
  );
}
