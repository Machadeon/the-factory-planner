"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EastIcon from "@mui/icons-material/East";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import { useState } from "react";
import type AssemblyLine from "../models/assembly-line";
import type Factory from "../models/factory";
import { recipeLookup } from "../models/library";
import type Part from "../models/part";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import { displayNum } from "../utils";
import RecipeComponent from "./RecipeComponent";
import TextCalculatorField from "./TextCalculatorField";

interface AssemblyLineComponentProps {
  assemblyLine: AssemblyLine;
  mainPart: Part;
  factory: Factory;
  onNavigateToFactory?: (id: string) => void;
}

function NestedFactoryRow({
  assemblyLine,
  factory,
  onNavigateToFactory,
}: {
  assemblyLine: AssemblyLine;
  factory: Factory;
  onNavigateToFactory?: (id: string) => void;
}) {
  const recipe = assemblyLine.recipe;
  const rate = assemblyLine.rate;
  const factoryId = recipe.slug.replace("factory:", "");

  function updateRate(newRate: number) {
    assemblyLine.rate = newRate;
    factory.update();
  }

  return (
    <div className="sp-recipe-component flex flex-row grow items-center gap-x-2 p-2">
      {onNavigateToFactory ? (
        <button
          type="button"
          className="w-3xs font-medium text-left underline cursor-pointer hover:opacity-70"
          onClick={() => onNavigateToFactory(factoryId)}
        >
          {recipe.name}
        </button>
      ) : (
        <span className="w-3xs font-medium">{recipe.name}</span>
      )}
      <div className="flex items-center gap-x-1">
        <TextCalculatorField
          variant="outlined"
          size="small"
          label="Instances"
          className="w-28"
          value={rate}
          onCalculate={updateRate}
          slotProps={{ htmlInput: { className: "text-right" } }}
        />
      </div>
      <div className="w-2xs flex flex-row flex-wrap gap-x-2 items-center">
        {recipe.ingredients.map((ing) => (
          <span key={ing.part.slug} className="flex items-center gap-x-1">
            <Image
              src={ing.part.iconSmall}
              alt={ing.part.name}
              width={24}
              height={24}
            />
            {displayNum(ing.quantity * rate)}/min
          </span>
        ))}
      </div>
      <EastIcon />
      <div className="w-2xs flex flex-row flex-wrap gap-x-2 items-center">
        {recipe.products.map((prod) => (
          <span key={prod.part.slug} className="flex items-center gap-x-1">
            <Image
              src={prod.part.iconSmall}
              alt={prod.part.name}
              width={24}
              height={24}
            />
            {displayNum(prod.quantity * rate)}/min
          </span>
        ))}
      </div>
    </div>
  );
}

function ClockDisplay({ clock }: { clock: number }) {
  const [copied, setCopied] = useState(false);
  const fullPrecision = `${clock.toFixed(5)}%`;

  function copy() {
    navigator.clipboard.writeText(fullPrecision);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="inline-flex items-center gap-x-0.5 ps-1">
      <span>{clock.toFixed(1)}%</span>
      <Tooltip
        title={copied ? "Copied!" : `Copy "${fullPrecision}"`}
        enterDelay={300}
      >
        <IconButton size="small" onClick={copy} className="p-0">
          <ContentCopyIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </span>
  );
}

function MachineCountDisplay({ assemblyLine }: { assemblyLine: AssemblyLine }) {
  const count = assemblyLine.getMachineCount();

  let label: React.ReactNode;
  if ("fullMachines" in count) {
    if (count.fullMachines === 0 && count.remainderClock === 0) {
      label = <span className="text-gray-400">0 machines</span>;
    } else if (count.remainderClock > 0) {
      label = (
        <>
          {count.fullMachines} @{" "}
          <ClockDisplay clock={assemblyLine.machineSpeed} />
          {" + 1 @ "}
          <ClockDisplay clock={count.remainderClock} />
        </>
      );
    } else {
      label = (
        <>
          {count.fullMachines} @{" "}
          <ClockDisplay clock={assemblyLine.machineSpeed} />
        </>
      );
    }
  } else {
    label = (
      <>
        {count.machineCount} @ <ClockDisplay clock={count.uniformClock} />
      </>
    );
  }

  return <div className="flex items-center min-h-[20px] text-sm">{label}</div>;
}

function AssemblyLineControls({
  assemblyLine,
  factory,
}: {
  assemblyLine: AssemblyLine;
  factory: Factory;
}) {
  const maxSloopSlots = assemblyLine.maxSloopSlots();

  function setSpeed(raw: number) {
    const speed = Math.min(Math.max(raw, 1), 250);
    assemblyLine.machineSpeed = speed;
    assemblyLine.powerShards = Math.max(0, Math.ceil((speed - 100) / 50));
    factory.update();
  }

  function setRemainder(allowRemainder: boolean) {
    assemblyLine.allowRemainder = allowRemainder;
    factory.update();
  }

  function setMachineCount(rawN: number) {
    const N = Math.max(1, Math.round(rawN));
    const recipe = assemblyLine.recipe as Recipe;
    const baseRate = 60 / recipe.processingTime;
    const newSpeed =
      assemblyLine.rate > 0 ? (assemblyLine.rate / (N * baseRate)) * 100 : 100;
    const clamped = Math.min(250, Math.max(1, newSpeed));
    assemblyLine.machineSpeed = clamped;
    assemblyLine.powerShards = Math.max(0, Math.ceil((clamped - 100) / 50));
    assemblyLine.allowRemainder = false;
    factory.update();
  }

  const building = (assemblyLine.recipe as Recipe).building;

  const speedMarks = [0, 100, 150, 200, 250].map((v) => ({
    value: v,
    label: `${v}`,
  }));
  const sloopMarks = Array.from(
    { length: (maxSloopSlots || 4) + 1 },
    (_, i) => ({ value: i, label: `${i}` }),
  );

  const sloopColor = maxSloopSlots === 0 ? "#aaa" : "#ec4899";

  const totalShards = assemblyLine.getTotalShards();
  const machineCountResult = assemblyLine.getMachineCount();
  const totalMachines =
    "fullMachines" in machineCountResult
      ? machineCountResult.fullMachines +
        (machineCountResult.remainderClock > 0 ? 1 : 0)
      : machineCountResult.machineCount;
  const totalSloops = assemblyLine.sloopedSlots * totalMachines;

  return (
    <div className="flex flex-col gap-y-2 px-3 py-2 border-l border-zinc-700 w-[280px] shrink-0 items-center">
      {/* Clock speed slider — power shards are derived from this */}
      <div className="flex flex-row gap-x-4 w-full">
        <Tooltip title="Machine clock speed" enterDelay={500}>
          <Image
            src="/images/items/research-powerslugs-2-c_64.png"
            alt="Power Shard"
            width={48}
            height={48}
            className="shrink-0"
          />
        </Tooltip>
        <Slider
          min={0}
          max={250}
          step={null}
          marks={speedMarks}
          value={assemblyLine.machineSpeed}
          onChange={(_, v) => setSpeed(v as number)}
          sx={{
            flex: 1,
            "& .MuiSlider-track": {
              backgroundColor: "#f97316",
              borderColor: "#f97316",
            },
            "& .MuiSlider-thumb": { backgroundColor: "#f97316" },
            "& .MuiSlider-markActive": { backgroundColor: "#f97316" },
          }}
        />
      </div>

      {/* Machine count + building name + clock speed */}
      <div className="flex flex-row gap-x-1 items-center">
        <TextCalculatorField
          variant="outlined"
          size="small"
          className="w-14 shrink-0"
          value={totalMachines}
          onCalculate={setMachineCount}
          slotProps={{ htmlInput: { className: "text-right" } }}
        />
        <span className="shrink-0 text-sm text-gray-400">×</span>
        <span className="min-w-0 truncate text-xs text-gray-500">
          <Tooltip title={building.name}>
            <Image
              src={building.iconSmall}
              alt={building.name}
              width={48}
              height={48}
            />
          </Tooltip>
        </span>
        <span className="shrink-0 text-sm text-gray-400">@</span>
        <TextCalculatorField
          variant="outlined"
          size="small"
          className="w-20 shrink-0"
          value={assemblyLine.machineSpeed}
          onCalculate={setSpeed}
          slotProps={{
            htmlInput: { className: "text-right" },
            input: {
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            },
          }}
        />
      </div>

      {/* Machine count display with per-clock copy buttons */}
      <MachineCountDisplay assemblyLine={assemblyLine} />

      {/* All-equal toggle */}
      <Tooltip
        title={
          assemblyLine.allowRemainder
            ? "Machines run at mixed clock speeds (bank + remainder)"
            : "All machines run at the same clock speed"
        }
        enterDelay={500}
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!assemblyLine.allowRemainder}
              onChange={(e) => setRemainder(!e.target.checked)}
            />
          }
          label={
            <span className="text-xs text-gray-500 whitespace-nowrap">
              All equal
            </span>
          }
          labelPlacement="end"
          className="m-0 gap-x-1"
        />
      </Tooltip>

      <div className="flex flex-row gap-x-1 text-xs text-gray-700 dark:text-gray-300">
        {/* Power shard totals (derived) */}
        <Image
          src="/images/items/desc-crystalshard-c_64.png"
          alt=""
          width={16}
          height={16}
          className="shrink-0"
        />
        <span>
          {assemblyLine.powerShards}/machine · {totalShards} total
        </span>
        {/* Somersloop totals */}
        <Image
          src="/images/items/Somersloop.png"
          alt=""
          width={16}
          height={16}
          className="shrink-0"
        />
        <span>{totalSloops} total</span>
      </div>

      {/* Power consumption */}
      {(() => {
        const power = assemblyLine.getPowerConsumption();
        const variable = power.max - power.min > 0.01;
        return (
          <div className="flex flex-row gap-x-1 text-xs text-gray-700 dark:text-gray-300">
            <Image
              src="/images/items/power_192.png"
              alt=""
              width={16}
              height={16}
              className="shrink-0"
            />
            {variable ? (
              <span>
                {displayNum(power.avg)} MW avg · {displayNum(power.min)}–
                {displayNum(power.max)} MW
              </span>
            ) : (
              <span>{displayNum(power.avg)} MW</span>
            )}
          </div>
        );
      })()}

      {/* Somersloop slider */}
      <div className="flex flex-row gap-x-4 w-full">
        <Tooltip title="Production amplifier" enterDelay={500}>
          <Image
            src="/images/items/research-alien-productionbooster-c_64.png"
            alt="Somersloop"
            width={48}
            height={48}
            className="shrink-0"
          />
        </Tooltip>
        <Slider
          min={0}
          max={maxSloopSlots || 0}
          step={1}
          marks={sloopMarks}
          disabled={maxSloopSlots === 0}
          value={assemblyLine.sloopedSlots}
          onChange={(_, v) => {
            assemblyLine.setSloopedSlots(v as number);
            if (factory.productionLines.some((pl) => pl.outputRate > 0)) {
              factory.autoCalculateRates();
            } else {
              factory.update();
            }
          }}
          sx={{
            flex: 1,
            "& .MuiSlider-track": {
              backgroundColor: "#ec4899",
              borderColor: "#ec4899",
            },
            "& .MuiSlider-thumb": { backgroundColor: sloopColor },
            "& .MuiSlider-markActive": { backgroundColor: "#ec4899" },
          }}
        />
      </div>
    </div>
  );
}

export default function AssemblyLineComponent(
  props: AssemblyLineComponentProps,
) {
  if (props.assemblyLine.recipe.isFactoryRecipe) {
    return (
      <NestedFactoryRow
        assemblyLine={props.assemblyLine}
        factory={props.factory}
        onNavigateToFactory={props.onNavigateToFactory}
      />
    );
  }

  const recipe = props.assemblyLine.recipe as Recipe;

  function adjustProductionRate(
    recipePart: RecipePart,
    isProduct: boolean,
    newValue: number,
  ) {
    if (isProduct)
      props.assemblyLine.setPartProductionRate(recipePart.part, newValue);
    else props.assemblyLine.setPartConsumptionRate(recipePart.part, newValue);
    props.factory.update();
  }

  const allOutputs = props.factory.recipeOutputs().map((part) => part.slug);
  const partsNeeded = recipe.ingredients
    .map((ing) => ing.part.slug)
    .filter(
      (partSlug) =>
        allOutputs.indexOf(partSlug) < 0 &&
        Object.hasOwn(recipeLookup, partSlug),
    );

  return (
    <div className="flex flex-row items-stretch grow">
      <RecipeComponent
        recipe={recipe}
        rate={props.assemblyLine.rate}
        sloopMultiplier={props.assemblyLine.getSloopMultiplier()}
        setPartRate={adjustProductionRate}
        partRateEditable={recipeLookup[props.mainPart.slug].length > 1}
        partsNeeded={partsNeeded}
        factory={props.factory}
      />
      <AssemblyLineControls
        assemblyLine={props.assemblyLine}
        factory={props.factory}
      />
    </div>
  );
}
