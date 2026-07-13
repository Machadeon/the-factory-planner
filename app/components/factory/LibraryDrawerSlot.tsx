"use client";

import type useFactoryPageFlows from "@/app/hooks/useFactoryPageFlows";
import type useLibrary from "@/app/hooks/useLibrary";
import LibraryDrawer from "../library/LibraryDrawer";

interface LibraryDrawerSlotProps {
  pinned: boolean;
  libraryApi: ReturnType<typeof useLibrary>;
  flows: ReturnType<typeof useFactoryPageFlows>;
  onPinChange: (pinned: boolean) => void;
}

export default function LibraryDrawerSlot({
  pinned,
  libraryApi,
  flows,
  onPinChange,
}: LibraryDrawerSlotProps) {
  return (
    <LibraryDrawer
      open={pinned ? true : flows.libraryOpen}
      onClose={flows.handleCloseLibrary}
      libraryApi={libraryApi}
      onLoadFactory={flows.handleLoadFactory}
      onNewFactory={flows.handleNewFactory}
      onImport={flows.handleImport}
      pinned={pinned}
      onPinChange={onPinChange}
    />
  );
}
