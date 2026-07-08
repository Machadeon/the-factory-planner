"use client";

import useDragResize from "@/app/hooks/useDragResize";
import type Factory from "@/app/models/factory";
import type { StorageLibrary } from "@/app/models/factory-storage";
import FactoryOverviewComponent from "../FactoryOverviewComponent";

interface FactorySidebarProps {
  factory: Factory;
  library: StorageLibrary;
  currentFactoryId: string | null;
  onRebuild: () => void;
  onNavigateToFactory: (id: string) => void;
}

export default function FactorySidebar({
  factory,
  library,
  currentFactoryId,
  onRebuild,
  onNavigateToFactory,
}: FactorySidebarProps) {
  const { sidebarWidth, handleResizeDividerMouseDown } = useDragResize();
  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse-only resize handle; keyboard-accessible version tracked separately */}
      <div
        className="w-1.5 cursor-ew-resize flex-none hover:bg-blue-500/40 bg-black/20 dark:bg-white/20 min-h-full transition-colors"
        onMouseDown={handleResizeDividerMouseDown}
      />
      <div
        style={{ width: sidebarWidth }}
        className="flex-none overflow-y-auto"
      >
        <FactoryOverviewComponent
          factory={factory}
          onRebuild={onRebuild}
          library={library}
          currentFactoryId={currentFactoryId}
          onNavigateToFactory={onNavigateToFactory}
        />
      </div>
    </>
  );
}
