"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { FactoryProvider } from "@/app/contexts/FactoryContext";
import { LibraryProvider } from "@/app/contexts/LibraryContext";
import { NavigationProvider } from "@/app/contexts/NavigationContext";
import useAutosave from "@/app/hooks/useAutosave";
import useConsentGate from "@/app/hooks/useConsentGate";
import useFactorySession from "@/app/hooks/useFactorySession";
import useFactoryUrlSync, { type Section } from "@/app/hooks/useFactoryUrlSync";
import useLibrary from "@/app/hooks/useLibrary";
import {
  getLibraryPinned,
  setLibraryPinned as persistLibraryPinned,
} from "@/app/models/storage-service";
import FactoryHeader from "../FactoryHeader";
import FactoryPageDialogs from "./FactoryPageDialogs";
import FactorySections from "./FactorySections";
import FactorySidebar from "./FactorySidebar";
import LibraryDrawerSlot from "./LibraryDrawerSlot";
import SectionTabs from "./SectionTabs";
import useFactoryPageFlows from "./useFactoryPageFlows";

export default function FactoryPage() {
  const [activeSection, setActiveSection] = useState<Section>("planning");
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);
  const [libraryPinned, setLibraryPinned] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const libraryApi = useLibrary();
  const session = useFactorySession({
    library: libraryApi.library,
    setLibrary: libraryApi.setLibrary,
  });
  const performSaveRef = useRef<() => void>(() => {});
  const autosave = useAutosave({
    onFactoryMutate: session.onFactoryMutate,
    onSessionSwap: session.onSessionSwap,
    buildSerialized: session.buildSerialized,
    doSave: () => performSaveRef.current(),
  });
  const consent = useConsentGate({
    onConsentGranted: () => libraryApi.reload(),
  });
  const flows = useFactoryPageFlows({
    session,
    autosave,
    libraryApi,
    requireConsent: consent.requireConsent,
  });
  performSaveRef.current = flows.performSave;
  useFactoryUrlSync({
    session,
    libraryApi,
    activeSection,
    setActiveSection,
    onOrphanAutosaveRestore: () =>
      autosave.setAutosaveEnabled(false, { persist: false }),
  });

  // Re-render trigger only — children receive the proxy, not the snapshot;
  // every mutation reaches _updateRates, which rebuilds this tracked lookup.
  // Retained until step 5 drops it in the same commit as the render-count tripwire.
  const _rateTrigger = useSnapshot(session.store).factory.rateLookup;
  const { factory, currentFactoryId } = session;

  // Stable navigation callback: flows.* are fresh each render, so bind through a
  // ref updated in an effect and expose a referentially-stable wrapper.
  const navRef = useRef(flows.handleNavigateToFactory);
  useEffect(() => {
    navRef.current = flows.handleNavigateToFactory;
  });
  const navigateToFactory = useCallback((id: string) => navRef.current(id), []);

  useEffect(() => setLibraryPinned(getLibraryPinned()), []);

  function handlePinChange(pinned: boolean) {
    setLibraryPinned(pinned);
    persistLibraryPinned(pinned);
  }

  const drawer = (pinned: boolean) => (
    <LibraryDrawerSlot
      pinned={pinned}
      currentFactoryId={currentFactoryId}
      libraryApi={libraryApi}
      flows={flows}
      onPinChange={handlePinChange}
    />
  );

  return (
    <FactoryProvider store={session.store}>
      <LibraryProvider
        library={libraryApi.library}
        currentFactoryId={currentFactoryId}
        updatePartPointOverrides={libraryApi.updatePartPointOverrides}
      >
        <NavigationProvider navigateToFactory={navigateToFactory}>
          <FactoryPageDialogs
            consent={consent}
            flows={flows}
            jsonDialogOpen={jsonDialogOpen}
            onCloseJsonDialog={() => setJsonDialogOpen(false)}
            buildJson={session.buildSerialized}
          />
          {!libraryPinned && drawer(false)}
          <div className="flex flex-row grow min-h-full min-w-full">
            {libraryPinned && drawer(true)}
            <div
              className={`flex flex-col min-h-full grow ${libraryPinned ? "min-w-0" : "min-w-full"}`}
            >
              <FactoryHeader
                factoryName={session.factoryName}
                factoryIcon={factory.icon}
                isDirty={session.isDirty}
                autosaveEnabled={autosave.autosaveEnabled}
                onNameChange={session.setFactoryName}
                onIconChange={flows.handleIconChange}
                onOpenLibrary={
                  libraryPinned
                    ? undefined
                    : () => consent.requireConsent(flows.handleOpenLibrary)
                }
                onSave={flows.handleSave}
                onToggleAutosave={flows.handleToggleAutosave}
                onExport={flows.handleExportCurrent}
                onImport={flows.handleImport}
                onNewFactory={() => flows.handleNewFactory(null)}
                onViewJson={() => setJsonDialogOpen(true)}
                onExpandAll={() => setForceExpanded(true)}
                onCollapseAll={() => setForceExpanded(false)}
                productionLineCount={factory.productionLines.length}
              />
              <SectionTabs
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                solverError={factory.solverError}
              />
              <div className="flex flex-row grow">
                <FactorySections
                  activeSection={activeSection}
                  factory={factory}
                  library={libraryApi.library}
                  currentFactoryId={currentFactoryId}
                  forceExpanded={forceExpanded}
                  onToggleExpanded={() => setForceExpanded(null)}
                  onUpdateLibrary={libraryApi.updatePartPointOverrides}
                  flows={flows}
                />
                <FactorySidebar
                  factory={factory}
                  library={libraryApi.library}
                  currentFactoryId={currentFactoryId}
                  onRebuild={session.rebuild}
                  onNavigateToFactory={flows.handleNavigateToFactory}
                />
              </div>
            </div>
          </div>
        </NavigationProvider>
      </LibraryProvider>
    </FactoryProvider>
  );
}
