"use client";

import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import Factory from "../models/factory";
import { partLookup, parts, recipeLookup } from "../models/library";
import type Part from "../models/part";
import type ProductLine from "../models/product-line";
import Clickable from "./Clickable";
import ProductLineComponent from "./ProductLineComponent";

function Divider() {
  return (
    <div className="min-w-full bg-zinc-200 dark:bg-zinc-700 h-px my-1"></div>
  );
}

function getRandomPart(existingParts: string[]): Part {
  if (existingParts.length === 0) return partLookup["Desc_IronPlate_C"];

  var part: Part | undefined;
  while (
    !part ||
    !recipeLookup[part.slug] ||
    existingParts.indexOf(part.className) >= 0
  ) {
    part = parts[Math.floor(Math.random() * parts.length)];
  }

  return partLookup[part.className];
}

export default function FactoryComponent() {
  const [factory, setFactory] = useState<Factory>(new Factory());
  factory.setState = () => {
    const newFactory = new Factory();
    newFactory.icon = factory.icon;
    newFactory.products = factory.products;
    setFactory(newFactory);
  };

  function addProductLine() {
    // TODO: display all products that don't have a product line, and add the one the user selects
    const isFactoryOutput = factory.products.length === 0;

    const newPart = getRandomPart(
      factory.products.map((pl) => pl.part.className),
    );

    const newProduct: ProductLine = {
      part: newPart,
      isFactoryOutput: isFactoryOutput,
      productionRate: 10,
      assemblyLines: [],
    };

    const newFactory = new Factory();
    newFactory.icon = factory.icon || newProduct.part.iconLarge;
    newFactory.products = [...factory.products, newProduct];
    setFactory(newFactory);
  }

  return (
    <div className="flex min-w-full flex-col">
      {factory.products.length === 0 ? (
        <p>Add a product to get started</p>
      ) : (
        factory.products.map((product) => (
          <div key={product.part.slug}>
            <ProductLineComponent productLine={product} factory={factory} />
            <Divider />
          </div>
        ))
      )}
      <Clickable
        className="flex min-w-full items-center p-4"
        onClick={addProductLine}
      >
        <AddIcon />
        Add Product
      </Clickable>
    </div>
  );
}
