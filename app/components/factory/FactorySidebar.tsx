"use client";

import useDragResize from "@/app/hooks/useDragResize";
import OverviewSidebar from "../overview/OverviewSidebar";

export default function FactorySidebar() {
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
        <OverviewSidebar />
      </div>
    </>
  );
}
