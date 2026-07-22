"use client";

import useDragResize from "@/app/hooks/useDragResize";
import OverviewSidebar from "../overview/OverviewSidebar";

export default function FactorySidebar() {
  const {
    sidebarWidth,
    handleResizeDividerMouseDown,
    handleResizeKeyDown,
    MIN_WIDTH,
    MAX_WIDTH,
  } = useDragResize();
  return (
    <>
      <hr
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuenow={sidebarWidth}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        tabIndex={0}
        className="w-1.5 h-auto border-0 cursor-ew-resize flex-none hover:bg-blue-500/40 bg-black/20 dark:bg-white/20 min-h-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500"
        onMouseDown={handleResizeDividerMouseDown}
        onKeyDown={handleResizeKeyDown}
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
