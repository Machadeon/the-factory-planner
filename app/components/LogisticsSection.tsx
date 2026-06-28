"use client";

import type Factory from "../models/factory";

interface LogisticsSectionProps {
  factory: Factory;
}

// Placeholder. The graphical logistics/flow view is a future addition
// (roadmap: nodes = assembly lines, edges = logistics).
export default function LogisticsSection(_props: LogisticsSectionProps) {
  return (
    <div className="flex flex-col grow items-center justify-center p-8 text-center text-gray-400">
      <p className="text-lg mb-1">Logistics</p>
      <p className="text-sm">
        A visual logistics view is coming soon — part flows between recipes,
        belts, and pipes.
      </p>
    </div>
  );
}
