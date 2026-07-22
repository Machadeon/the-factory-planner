"use client";

import type AssemblyLine from "../../models/assembly-line";
import { totalMachines } from "../../models/assembly-line";
import type Factory from "../../models/factory";
import type Recipe from "../../models/recipe";
import PowerSummary from "../overview/PowerSummary";
import Icon from "../ui/Icon";
import Slider from "../ui/Slider";
import Switch from "../ui/Switch";
import TextCalculatorField from "../ui/TextCalculatorField";
import MachineCountDisplay from "./MachineCountDisplay";

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
    factory.setClockSpeed(assemblyLine, raw);
  }

  function setRemainder(allowRemainder: boolean) {
    factory.setAllowRemainder(assemblyLine, allowRemainder);
  }

  function setMachineCount(rawN: number) {
    factory.setMachineCount(assemblyLine, rawN);
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
  const machineTotal = totalMachines(machineCountResult);
  const totalSloops = assemblyLine.sloopedSlots * machineTotal;

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
          accentColor="#f97316"
        />
      </div>

      {/* Machine count + building name + clock speed */}
      <div className="flex flex-row gap-x-1 items-center">
        <TextCalculatorField
          size="small"
          className="w-17 shrink-0"
          inputClassName="text-right"
          value={machineTotal}
          onCalculate={setMachineCount}
        />
        <span className="shrink-0 text-sm text-gray-400">×</span>
        <span className="min-w-0 truncate text-xs text-gray-500">
          <Icon src={building.iconSmall} label={building.name} size={48} />
        </span>
        <span className="shrink-0 text-sm text-gray-400">@</span>
        <TextCalculatorField
          size="small"
          className="w-20 shrink-0"
          inputClassName="text-right"
          value={assemblyLine.machineSpeed}
          onCalculate={setSpeed}
          endAdornment={<span className="text-sm text-gray-400 pl-1">%</span>}
        />
      </div>

      {/* Machine count display with per-clock copy buttons */}
      <MachineCountDisplay assemblyLine={assemblyLine} />

      {/* All-equal toggle */}
      <Switch
        size="small"
        checked={!assemblyLine.allowRemainder}
        onChange={(checked) => setRemainder(!checked)}
        label={
          <span className="text-xs text-gray-500 whitespace-nowrap">
            All machines equal
          </span>
        }
        tooltip={
          assemblyLine.allowRemainder
            ? "Machines run at mixed clock speeds (bank + remainder)"
            : "All machines run at the same clock speed"
        }
        className="gap-x-1"
      />

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
      <div className="flex flex-row gap-x-1 text-xs text-gray-700 dark:text-gray-300">
        <PowerSummary
          power={assemblyLine.getPowerConsumption()}
          iconSize={16}
          iconAlt=""
          variant="compact"
        />
      </div>

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
            factory.setSloopedSlots(assemblyLine, v as number);
          }}
          accentColor="#ec4899"
          thumbColor={sloopColor}
        />
      </div>
    </div>
  );
}
