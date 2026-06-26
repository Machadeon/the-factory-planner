"use client";

import TextField from "@mui/material/TextField";
import Image from "next/image";
import { useState } from "react";
import type Factory from "../models/factory";
import type ProductLine from "../models/product-line";
import type Recipe from "../models/recipe";

interface ProductLineComponentProps {
  product: ProductLine;
  factory: Factory;
}

export default function ProductLineComponent({
  product,
  factory,
}: ProductLineComponentProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  return (
    <div className="flex flex-row items-center gap-2">
      <div className="flex flex-row items-center gap-2 w-sm flex-none">
        <Image
          src={product.part.iconSmall}
          alt={product.part.name}
          width={64}
          height={64}
        />
        <span className="text-xl">{product.part.name}</span>
      </div>
      <div className="flex flex-row items-center gap-2 w-xs flex-none justify-end">
        {product.factoryOutput ? (
          <TextField
            id="standard-basic"
            label="Production Rate"
            variant="outlined"
            size="small"
            value={product.productionRate}
          />
        ) : (
          <span>{parseFloat(product.productionRate.toFixed(4))}</span>
        )}
        <span>/min</span>
      </div>
    </div>
  );
}
