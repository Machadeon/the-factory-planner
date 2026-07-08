"use client";

import type useLibrary from "@/app/hooks/useLibrary";
import FactoryLibraryDrawer from "../FactoryLibraryDrawer";
import type useFactoryPageFlows from "./useFactoryPageFlows";

interface LibraryDrawerSlotProps {
  pinned: boolean;
  currentFactoryId: string | null;
  libraryApi: ReturnType<typeof useLibrary>;
  flows: ReturnType<typeof useFactoryPageFlows>;
  onPinChange: (pinned: boolean) => void;
}

export default function LibraryDrawerSlot({
  pinned,
  currentFactoryId,
  libraryApi,
  flows,
  onPinChange,
}: LibraryDrawerSlotProps) {
  return (
    <FactoryLibraryDrawer
      open={pinned ? true : flows.libraryOpen}
      onClose={flows.handleCloseLibrary}
      library={libraryApi.library}
      currentFactoryId={currentFactoryId}
      onLibraryChange={libraryApi.setLibrary}
      onLoadFactory={flows.handleLoadFactory}
      onNewFactory={flows.handleNewFactory}
      onImport={flows.handleImport}
      pinned={pinned}
      onPinChange={onPinChange}
    />
  );
}
