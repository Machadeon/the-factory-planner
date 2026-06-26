"use client";

import EastIcon from "@mui/icons-material/East";
import EditIcon from "@mui/icons-material/Edit";
import Image from "next/image";
import { type MouseEventHandler, useState } from "react";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import { displayNum } from "../utils";
import Clickable, { defaultClass as clickableClass } from "./Clickable";
import TextCalculatorField from "./TextCalculatorField";

interface RecipeComponentProps {
  recipe: Recipe;
  productionRate: number;
  onClick?: MouseEventHandler<HTMLDivElement>;
  setPartRate?: (recipePart: RecipePart, newValue: number) => void;
}

export default function RecipeComponent({
  recipe,
  productionRate,
  onClick,
  setPartRate,
}: RecipeComponentProps) {
  const [manualRatePart, setManualRatePart] = useState<string | undefined>();

  var className =
    "sp-recipe-component flex flex-row grow items-center gap-x-2 p-2";
  if (onClick) className += ` ${clickableClass}`;

  function setPartRateInternal(recipePart: RecipePart, newValue: number) {
    if (setPartRate) setPartRate(recipePart, newValue);
    setManualRatePart(undefined);
  }

  return (
    <div className={className} onClick={onClick}>
      <Image
        src={recipe.building.iconLarge}
        alt={recipe.building.name}
        width={64}
        height={64}
      />
      <span className="w-xs">{recipe.name}</span>
      <div className="w-3xs grid grid-cols-[40px_40px_auto] gap-x-1 items-center">
        {recipe.ingredients.flatMap((ing) => [
          <span className="text-right" key={`ing-${ing.part.slug}-quantity`}>
            {ing.quantity}x
          </span>,
          <Image
            src={ing.part.iconSmall}
            alt={ing.part.name}
            width={32}
            height={32}
            key={`ing-${ing.part.slug}-image`}
          />,
          manualRatePart === `ing-${ing.part.slug}` && setPartRate ? (
            <div
              className="flex items-center"
              key={`ing-${ing.part.slug}-rate`}
            >
              <TextCalculatorField
                variant="outlined"
                size="small"
                className="w-24"
                autoFocus
                value={
                  (ing.quantity * productionRate) / recipe.products[0].quantity
                }
                onCalculate={(newValue) => setPartRateInternal(ing, newValue)}
              />
              /min
            </div>
          ) : (
            <span className="text-right" key={`ing-${ing.part.slug}-rate`}>
              {setPartRate ? (
                <Clickable
                  onClick={() => setManualRatePart(`ing-${ing.part.slug}`)}
                  className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
                >
                  <EditIcon />
                </Clickable>
              ) : (
                ""
              )}
              (
              {displayNum(
                (ing.quantity * productionRate) / recipe.products[0].quantity,
              )}
              /min)
            </span>
          ),
        ])}
      </div>
      <EastIcon />
      <div className="w-3xs grid grid-cols-[40px_40px_auto] gap-x-1 items-center">
        {recipe.products.flatMap((prod) => [
          <span className="text-right" key={`prod-${prod.part.slug}-quantity`}>
            {prod.quantity}x
          </span>,
          <Image
            src={prod.part.iconSmall}
            alt={prod.part.name}
            width={32}
            height={32}
            key={`prod-${prod.part.slug}-image`}
          />,
          manualRatePart === `prod-${prod.part.slug}` && setPartRate ? (
            <div
              className="flex items-center"
              key={`prod-${prod.part.slug}-rate`}
            >
              <TextCalculatorField
                variant="outlined"
                size="small"
                className="w-24"
                autoFocus
                value={
                  (prod.quantity * productionRate) / recipe.products[0].quantity
                }
                slotProps={{
                  htmlInput: {
                    sx: {
                      textAlign: "right",
                    },
                  },
                }}
                onCalculate={(newValue) => setPartRateInternal(prod, newValue)}
              />
              /min
            </div>
          ) : (
            <span className="text-right" key={`prod-${prod.part.slug}-rate`}>
              {manualRatePart === `prod-${prod.part.slug}` ? (
                <div></div>
              ) : (
                <>
                  {setPartRate ? (
                    <Clickable
                      onClick={() =>
                        setManualRatePart(`prod-${prod.part.slug}`)
                      }
                      className="sp-recipe-ingredient-edit-btn inline p-1 mr-1"
                    >
                      <EditIcon />
                    </Clickable>
                  ) : (
                    ""
                  )}
                  (
                  {displayNum(
                    (prod.quantity * productionRate) /
                      recipe.products[0].quantity,
                  )}
                  /min)
                </>
              )}
            </span>
          ),
        ])}
      </div>
    </div>
  );
}
