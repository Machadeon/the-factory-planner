"use client";

import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import { displayNum } from "@/app/lib/format";
import type AssemblyLine from "../models/assembly-line";
import type Factory from "../models/factory";
import type Recipe from "../models/recipe";
import Icon from "./Icon";
import MachineCountDisplay from "./MachineCountDisplay";
import TextCalculatorField from "./TextCalculatorField";

interface AssemblyLineControlsProps {
  assemblyLine: AssemblyLine;
  factory: Factory;
}

export default function AssemblyLineControls({
  assemblyLine,
  factory,
}: AssemblyLineControlsProps) {
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
        <Icon
          src="/images/items/research-powerslugs-2-c_64.png"
          label="Machine clock speed"
          size={48}
          className="shrink-0"
        />
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
          className="w-17 shrink-0"
          value={totalMachines}
          onCalculate={setMachineCount}
          slotProps={{ htmlInput: { className: "text-right" } }}
        />
        <span className="shrink-0 text-sm text-gray-400">×</span>
        <span className="min-w-0 truncate text-xs text-gray-500">
          <Icon src={building.iconSmall} label={building.name} size={48} />
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
              All machines equal
            </span>
          }
          labelPlacement="end"
          className="m-0 gap-x-1"
        />
      </Tooltip>

      <div className="flex flex-row gap-x-1 text-xs text-gray-700 dark:text-gray-300">
        {/* Power shard totals (derived) */}
        <Icon
          src="/images/items/desc-crystalshard-c_64.png"
          size={16}
          className="shrink-0"
        />
        <span>
          {assemblyLine.powerShards}/machine · {totalShards} total
        </span>
        {/* Somersloop totals */}
        <Icon
          src="/images/items/Somersloop.png"
          size={16}
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
            <Icon
              src="/images/items/power_192.png"
              size={16}
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
        <Icon
          src="/images/items/research-alien-productionbooster-c_64.png"
          label="Production amplifier"
          size={48}
          className="shrink-0"
        />
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
