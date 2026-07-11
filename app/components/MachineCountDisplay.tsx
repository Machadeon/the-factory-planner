"use client";

import type AssemblyLine from "../models/assembly-line";
import ClockDisplay from "./ClockDisplay";

interface MachineCountDisplayProps {
  assemblyLine: AssemblyLine;
}

export default function MachineCountDisplay({
  assemblyLine,
}: MachineCountDisplayProps) {
  const count = assemblyLine.getMachineCount();

  let label: React.ReactNode;
  if (count.kind === "remainder") {
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
