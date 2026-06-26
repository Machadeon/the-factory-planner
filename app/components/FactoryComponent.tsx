"use client";

import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import type Factory from "../models/factory";
import { partLookup } from "../models/library";
import type ProductLine from "../models/product-line";
import ProductLineComponent from "./ProductLineComponent";

function Divider() {
  return (
    <div className="min-w-full bg-zinc-200 dark:bg-zinc-700 h-px my-1"></div>
  );
}

interface FactoryComponentProps {
  factory?: Factory;
}

export default function FactoryComponent({ factory }: FactoryComponentProps) {
  if (factory == undefined) {
    factory = { products: [] };
  }

  const [productLines, setProductLines] = useState<ProductLine[]>(
    factory.products,
  );

  function addProductLine() {
    // TODO: display all products that don't have a product line, and add the one the user selects
    const newProduct: ProductLine = {
      part: partLookup["Desc_IronPlate_C"],
      factoryOutput: productLines.length === 0,
      productionRate: 10,
      assemblyLines: [],
    };

    setProductLines([...productLines, newProduct]);
  }

  return (
    <div className="flex min-w-full flex-col">
      {productLines.length === 0 ? (
        <p>Add a product to get started</p>
      ) : (
        productLines.map((product, i) => (
          <div key={i}>
            <ProductLineComponent product={product} factory={factory} />
            <Divider />
          </div>
        ))
      )}
      <div
        className="flex min-w-full items-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 p-4 rounded-sm active:bg-zinc-200 dark:active:bg-zinc-700"
        onClick={addProductLine}
      >
        <AddIcon />
        Add Product
      </div>
    </div>
  );
}
