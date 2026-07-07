"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSnapshot } from "valtio";
import { withBasePath } from "@/app/lib/base-path";
import { sanitizeFilename } from "@/app/lib/filenames";
import { formatSolverError } from "@/app/lib/format-solver-error";
import useAutosave from "../hooks/useAutosave";
import useConsentGate from "../hooks/useConsentGate";
import useDragResize from "../hooks/useDragResize";
import useFactorySession from "../hooks/useFactorySession";
import useLibrary from "../hooks/useLibrary";
import { downloadJson } from "../lib/download";
import {
  CURRENT_SCHEMA_VERSION,
  collectFactoryBundle,
  deserializeFactory,
  type SerializedFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import { mergeLibrary, mergeSingleFactory } from "../models/library-ops";
import type Part from "../models/part";
import {
  getCurrentFactoryId,
  getLibraryPinned,
  hasConsent,
  setLibraryPinned as persistLibraryPinned,
  readAutosave,
} from "../models/storage-service";
import FactoryHeader from "./FactoryHeader";
import FactoryLibraryDrawer from "./FactoryLibraryDrawer";
import FactoryOverviewComponent from "./FactoryOverviewComponent";
import LogisticsSection from "./LogisticsSection";
import OptimizationSection from "./OptimizationSection";
import PlanningSection from "./PlanningSection";
import StorageConsentDialog from "./StorageConsentDialog";
import ConfirmDialog from "./ui/ConfirmDialog";

type Section = "planning" | "optimization" | "logistics";

export default function FactoryComponent() {
  const [activeSection, setActiveSection] = useState<Section>("planning");
  const hashSyncInitialized = useRef(false);
  // Captured during render, before any layout effects can overwrite window.location.
  const initialHashRef = useRef<string>(
    typeof window !== "undefined" ? window.location.hash.slice(1) : "",
  );
  // Same reason: the factory URL layout effect fires on mount (currentFactoryId=null)
  // and pushes "/" before restoreFactory can read window.location.search.
  const initialSearchRef = useRef<string>(
    typeof window !== "undefined" ? window.location.search : "",
  );
  // Always-current ref so the factory URL layout effect can include the active
  // section hash without adding activeSection to its dependency array (which
  // would create a history entry on every tab switch).
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);
  const [libraryPinned, setLibraryPinned] = useState(false);
  const { sidebarWidth, handleResizeDividerMouseDown } = useDragResize();

  // Set true in popstate handler to stop URL-sync effect from pushing a new
  // history entry (which would destroy the forward stack).
  const suppressNextUrlPush = useRef(false);

  const {
    library,
    setLibrary,
    reload,
    replaceLibrary,
    updatePartPointOverrides,
  } = useLibrary();

  const {
    store,
    factory,
    factoryName,
    setFactoryName,
    currentFactoryId,
    currentSlug,
    currentFolderId,
    createdAt,
    isDirty,
    loadSerialized,
    clearTo,
    rebuild,
    buildSerialized,
    doSave,
    onFactoryMutate,
    onSessionSwap,
  } = useFactorySession({ library, setLibrary });

  const { autosaveEnabled, setAutosaveEnabled, enableAutosave, cancelPending } =
    useAutosave({
      onFactoryMutate,
      onSessionSwap,
      buildSerialized,
      doSave: () => performSave(),
    });

  // Re-render trigger only — children receive the proxy, not the snapshot.
  // Every model mutation funnels through update() → _updateRates, which
  // rebuilds rateLookup, so this single tracked read covers all edits.
  const _rateTrigger = useSnapshot(store).factory.rateLookup;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { consentOpen, requireConsent, handleAllow, handleCancel } =
    useConsentGate({ onConsentGranted: () => reload() });
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);
  const [pendingLoadFactory, setPendingLoadFactory] =
    useState<SerializedFactory | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [pendingClearFolderId, setPendingClearFolderId] = useState<
    string | null
  >(null);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const otherFactoriesKey = useMemo(
    () =>
      JSON.stringify(
        library.factories
          .filter((sf) => sf.id !== currentFactoryId)
          .map((sf) => {
            return {
              id: sf.id,
              products: sf.productionLines
                .filter((pl) => pl.outputRate > 0)
                .map((pl) => pl.partSlug),
            };
          }),
      ),
    [library.factories, currentFactoryId],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: only update when the lookup key updates
  const deserializedOtherFactories = useMemo(
    () =>
      library.factories.flatMap((sf) => {
        if (sf.id === currentFactoryId) return [];
        const f = deserializeFactory(sf, library);
        if (!f) return [];
        return [{ sf, factory: f }];
      }),
    [otherFactoriesKey],
  );

  // Restore priority: URL param → autosave → last saved factory. All three
  // delegate to the session's loadSerialized; deserialization is pre-flighted
  // so a corrupt entry falls through silently instead of alerting.
  function restoreFactory(lib: StorageLibrary): boolean {
    // Priority 1: URL param — ?factory=<slug> (new) or ?factoryId=<id> (legacy)
    const urlParams =
      typeof window !== "undefined"
        ? new URLSearchParams(initialSearchRef.current)
        : null;
    const urlSlug = urlParams?.get("factory");
    const urlFactoryId = urlParams?.get("factoryId");
    const saved = urlSlug
      ? lib.factories.find((f) => f.slug === urlSlug)
      : urlFactoryId
        ? lib.factories.find((f) => f.id === urlFactoryId)
        : null;
    if (saved && deserializeFactory(saved, lib)) {
      loadSerialized(saved, lib);
      // Stamp history state so popstate carries the factoryId
      window.history.replaceState(
        { factoryId: saved.id, slug: saved.slug ?? null },
        "",
        window.location.href,
      );
      return true;
    }

    // Priority 2: unsaved autosave
    const autosaved = readAutosave();
    if (autosaved && deserializeFactory(autosaved, lib)) {
      loadSerialized(autosaved, lib, {
        markDirty: true,
        backfillSlug: false,
        persistCurrentId: false,
      });
      if (!lib.factories.find((f) => f.id === autosaved.id)) {
        setAutosaveEnabled(false, { persist: false });
      }
      return true;
    }

    // Priority 3: last saved factory from localStorage
    const lastId = getCurrentFactoryId();
    if (lastId) {
      const saved = lib.factories.find((f) => f.id === lastId);
      if (saved && deserializeFactory(saved, lib)) {
        loadSerialized(saved, lib);
        return true;
      }
    }
    return false;
  }

  // On mount: load library and restore session if consent given. A fresh
  // session already has a generated name (useFactorySession).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    setLibraryPinned(getLibraryPinned());
    if (!hasConsent()) return;
    restoreFactory(reload());
  }, []);

  // Read initial tab from hash on mount. Uses initialHashRef (captured at render
  // time) because layout effects have already overwritten window.location by now.
  useEffect(() => {
    const hash = initialHashRef.current;
    const validSections: Section[] = ["planning", "optimization", "logistics"];
    if (validSections.includes(hash as Section)) {
      setActiveSection(hash as Section);
    }
    hashSyncInitialized.current = true;
  }, []);

  // Sync activeSection to URL hash via replaceState (no new history entry).
  // Skip first render so the mount effect above can read the existing hash
  // before we overwrite it.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (!hashSyncInitialized.current) return;
    const withoutHash = window.location.href.split("#")[0];
    window.history.replaceState(
      window.history.state,
      "",
      `${withoutHash}#${activeSection}`,
    );
  }, [activeSection]);

  // Update URL when the active factory changes so every factory has a
  // bookmarkable address. Uses pushState (not Next.js router) — no server
  // round-trip, no dynamic rendering, fully client-side.
  // useLayoutEffect (not useEffect) so this runs before rAF — the popstate
  // handler sets suppressNextUrlPush then queues a rAF reset; the layout
  // effect must read the flag before rAF clears it.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (suppressNextUrlPush.current) {
      suppressNextUrlPush.current = false;
      return;
    }
    const hash = `#${activeSectionRef.current}`;
    if (!currentFactoryId) {
      window.history.pushState({ factoryId: null }, "", withBasePath("/"));
    } else {
      const base = currentSlug
        ? `/?factory=${encodeURIComponent(currentSlug)}`
        : `/?factoryId=${encodeURIComponent(currentFactoryId)}`;
      window.history.pushState(
        { factoryId: currentFactoryId, slug: currentSlug },
        "",
        withBasePath(`${base}${hash}`),
      );
    }
  }, [currentFactoryId, currentSlug]);

  // Listen for back/forward navigation and switch to the factory in the URL.
  // biome-ignore lint/correctness/useExhaustiveDependencies: library captured by ref
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const id = e.state?.factoryId as string | null | undefined;
      const lib = reload();
      const target = id ? lib.factories.find((f) => f.id === id) : null;
      // Suppress URL-sync effect: popstate already updated the URL, we must
      // not pushState again or the forward history stack gets destroyed.
      suppressNextUrlPush.current = true;
      // Safety: if state doesn't change (same factory navigated to), the
      // URL-sync effect won't fire and won't reset the flag. rAF clears it.
      requestAnimationFrame(() => {
        suppressNextUrlPush.current = false;
      });
      const sectionHash = window.location.hash.slice(1);
      const validSections: Section[] = [
        "planning",
        "optimization",
        "logistics",
      ];
      setActiveSection(
        validSections.includes(sectionHash as Section)
          ? (sectionHash as Section)
          : "planning",
      );

      if (target) {
        if (deserializeFactory(target, lib)) loadSerialized(target, lib);
      } else if (!id) {
        // No factoryId in history state — could be a hash-only navigation (e.g. Playwright
        // page.goto, browser address bar) that didn't carry our pushState payload. Check
        // URL params before resetting so bookmarked factory URLs still load correctly.
        const urlParams = new URLSearchParams(window.location.search);
        const urlSlug = urlParams.get("factory");
        const urlFactoryId = urlParams.get("factoryId");
        const savedByUrl = urlSlug
          ? lib.factories.find((f) => f.slug === urlSlug)
          : urlFactoryId
            ? lib.factories.find((f) => f.id === urlFactoryId)
            : null;
        if (savedByUrl && deserializeFactory(savedByUrl, lib)) {
          loadSerialized(savedByUrl, lib);
          return;
        }
        // Navigated back to clean URL — treat as a new empty factory
        clearTo(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function addProductionLine(part: Part) {
    const libraryProducesIt = library.factories
      .filter((f) => f.id !== currentFactoryId)
      .some((f) =>
        f.productionLines.some(
          (pl) => pl.partSlug === part.slug && pl.outputRate > 0,
        ),
      );
    factory.addProductionLine(part, false, libraryProducesIt);
  }

  function removeProductionLine(part: Part) {
    factory.removeProductionLine(part);
  }

  // --- Consent gate (state machine lives in useConsentGate) ---

  function handleOpenLibrary() {
    if (libraryOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    reload();
    setLibraryOpen(true);
  }

  function handleCloseLibrary() {
    setLibraryOpen(false);
    requestAnimationFrame(() => {
      previousFocusRef.current?.focus();
    });
  }

  const handlePinChange = useCallback((pinned: boolean) => {
    setLibraryPinned(pinned);
    persistLibraryPinned(pinned);
  }, []);

  // --- Save ---

  // An explicit save supersedes any pending debounced autosave; the first
  // successful save of a new factory enables autosave.
  function performSave() {
    cancelPending();
    const { firstSave } = doSave();
    if (firstSave) enableAutosave();
  }

  function handleSave() {
    requireConsent(performSave);
  }

  // --- Export ---

  function handleExportCurrent() {
    const root = buildSerialized();
    // Self-contained bundle: the factory plus every factory it references, as
    // independent entries that point to each other by id. Imports via the
    // existing library-detection path ("factories" key).
    const factories = collectFactoryBundle(root, library);
    const bundle: StorageLibrary = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      folders: [],
      factories,
      rootId: root.id,
    };
    downloadJson(bundle, `${sanitizeFilename(factoryName)}.json`);
  }

  // --- Import ---

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const isLibrary = "factories" in parsed;
        const isSingleFactory = "productionLines" in parsed;

        if (isLibrary) {
          importLibrary(parsed as StorageLibrary);
        } else if (isSingleFactory) {
          importSingleFactory(parsed as SerializedFactory);
        } else {
          alert("Unrecognized JSON format.");
        }
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  }

  // Legacy single-factory files (schema <= 3) may embed nested factories. Run
  // them through the same bundle path so embedded copies become independent
  // entries, then load the imported factory.
  function importSingleFactory(data: SerializedFactory) {
    const { library: updatedLib, root } = mergeSingleFactory(library, data);
    if (!root) return;

    if (hasConsent()) {
      replaceLibrary(updatedLib);
    }

    // Resolve nested references against the freshly merged library, not the
    // stale state snapshot.
    loadSerialized(root, updatedLib);
  }

  function importLibrary(data: StorageLibrary) {
    if (!hasConsent()) {
      requireConsent(handleOpenLibrary);
      return;
    }

    const { library: updatedLib, root } = mergeLibrary(library, data);
    replaceLibrary(updatedLib);

    // Exported bundles carry the root factory's id — load it directly (resolving
    // references against the freshly merged library) instead of opening the drawer.
    if (root) {
      loadSerialized(root, updatedLib);
    } else {
      handleOpenLibrary();
    }
  }

  // --- Load factory from library ---

  function handleLoadFactory(serialized: SerializedFactory) {
    if (isDirty) {
      setPendingLoadFactory(serialized);
      setUnsavedPromptOpen(true);
    } else {
      loadSerialized(serialized, library);
      setLibraryOpen(false);
    }
  }

  function handleUnsavedSaveAndLoad() {
    performSave();
    if (pendingLoadFactory) {
      loadSerialized(pendingLoadFactory, library);
      setLibraryOpen(false);
    }
    setUnsavedPromptOpen(false);
    setPendingLoadFactory(null);
  }

  function handleUnsavedDiscardAndLoad() {
    if (pendingLoadFactory) {
      loadSerialized(pendingLoadFactory, library);
      setLibraryOpen(false);
    }
    setUnsavedPromptOpen(false);
    setPendingLoadFactory(null);
  }

  // --- New factory ---

  function handleNewFactory(folderId: string | null) {
    if (isDirty) {
      if (autosaveEnabled && hasConsent()) {
        // Auto-save then clear without prompting — autosave is on so no data is lost
        performSave();
        performClearFactory(folderId);
        return;
      }
      setPendingClearFolderId(folderId);
      setClearConfirmOpen(true);
      return;
    }
    performClearFactory(folderId);
  }

  function performClearFactory(folderId: string | null) {
    clearTo(folderId);
    setLibraryOpen(false);
    setAutosaveEnabled(false, { persist: false });
  }

  function handleClearSaveAndContinue() {
    if (hasConsent()) performSave();
    setClearConfirmOpen(false);
    performClearFactory(pendingClearFolderId);
    setPendingClearFolderId(null);
  }

  function handleClearDiscardAndContinue() {
    setClearConfirmOpen(false);
    performClearFactory(pendingClearFolderId);
    setPendingClearFolderId(null);
  }

  function handleClearCancel() {
    setClearConfirmOpen(false);
    setPendingClearFolderId(null);
  }

  function handleUnsavedCancel() {
    setUnsavedPromptOpen(false);
    setPendingLoadFactory(null);
  }

  function handleNavigateToFactory(id: string) {
    const sf = library.factories.find((f) => f.id === id);
    if (sf) handleLoadFactory(sf);
  }

  function handleToggleAutosave() {
    setAutosaveEnabled(!autosaveEnabled);
  }

  function handleIconChange(icon: string | undefined) {
    factory.icon = icon;
    factory.update();
  }

  function handleUpdateGlobalPointOverrides(overrides: Record<string, number>) {
    updatePartPointOverrides(overrides);
  }

  return (
    <>
      <StorageConsentDialog
        open={consentOpen}
        onAllow={handleAllow}
        onCancel={handleCancel}
      />

      {!libraryPinned && (
        <FactoryLibraryDrawer
          open={libraryOpen}
          onClose={handleCloseLibrary}
          library={library}
          currentFactoryId={currentFactoryId}
          onLibraryChange={setLibrary}
          onLoadFactory={handleLoadFactory}
          onNewFactory={handleNewFactory}
          onImport={handleImport}
          pinned={false}
          onPinChange={handlePinChange}
        />
      )}

      <ConfirmDialog
        open={unsavedPromptOpen}
        title="Unsaved changes"
        message="You have unsaved changes in the current factory. What would you like to do?"
        confirmLabel="Save & load"
        secondaryLabel="Discard & load"
        onSecondary={handleUnsavedDiscardAndLoad}
        onConfirm={handleUnsavedSaveAndLoad}
        onCancel={handleUnsavedCancel}
      />

      <Dialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="flex items-center justify-between">
          Factory JSON
          <Tooltip title="Copy to clipboard">
            <IconButton
              size="small"
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify(buildSerialized(), null, 2),
                )
              }
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent>
          <pre className="text-xs overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(buildSerialized(), null, 2)}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear factory?"
        message="You have unsaved changes in the current factory. What would you like to do?"
        confirmLabel="Save & clear"
        secondaryLabel="Discard & clear"
        onSecondary={handleClearDiscardAndContinue}
        onConfirm={handleClearSaveAndContinue}
        onCancel={handleClearCancel}
      />

      <div className="flex flex-row grow min-h-full min-w-full">
        {libraryPinned && (
          <FactoryLibraryDrawer
            open={true}
            onClose={handleCloseLibrary}
            library={library}
            currentFactoryId={currentFactoryId}
            onLibraryChange={setLibrary}
            onLoadFactory={handleLoadFactory}
            onNewFactory={handleNewFactory}
            onImport={handleImport}
            pinned={true}
            onPinChange={handlePinChange}
          />
        )}
        <div
          className={`flex flex-col min-h-full grow ${libraryPinned ? "min-w-0" : "min-w-full"}`}
        >
          <FactoryHeader
            factoryName={factoryName}
            factoryIcon={factory.icon}
            isDirty={isDirty}
            autosaveEnabled={autosaveEnabled}
            onNameChange={setFactoryName}
            onIconChange={handleIconChange}
            onOpenLibrary={
              libraryPinned
                ? undefined
                : () => requireConsent(handleOpenLibrary)
            }
            onSave={handleSave}
            onToggleAutosave={handleToggleAutosave}
            onExport={handleExportCurrent}
            onImport={handleImport}
            onNewFactory={() => handleNewFactory(null)}
            onViewJson={() => setJsonDialogOpen(true)}
            onExpandAll={() => setForceExpanded(true)}
            onCollapseAll={() => setForceExpanded(false)}
            productionLineCount={factory.productionLines.length}
          />

          <Tabs
            value={activeSection}
            onChange={(_, v) => setActiveSection(v as Section)}
            className="border-b border-gray-700"
          >
            <Tab label="Planning" value="planning" />
            <Tab label="Optimization" value="optimization" />
            <Tab label="Logistics" value="logistics" />
          </Tabs>

          {factory.solverError && (
            <Alert severity="warning" className="m-2 text-sm">
              {formatSolverError(factory.solverError)}
            </Alert>
          )}

          <div className="flex flex-row grow">
            <div className="flex flex-col grow min-w-0">
              {activeSection === "planning" && (
                <PlanningSection
                  factory={factory}
                  library={library}
                  currentFactoryId={currentFactoryId}
                  candidateFactories={deserializedOtherFactories}
                  forceExpanded={forceExpanded}
                  onToggle={() => setForceExpanded(null)}
                  onAddProduct={addProductionLine}
                  onRemoveProduct={removeProductionLine}
                  onNavigateToFactory={handleNavigateToFactory}
                />
              )}
              {activeSection === "optimization" && (
                <OptimizationSection
                  factory={factory}
                  library={library}
                  currentFactoryId={currentFactoryId}
                  onUpdateLibrary={handleUpdateGlobalPointOverrides}
                />
              )}
              {activeSection === "logistics" && (
                <LogisticsSection
                  factory={factory}
                  library={library}
                  currentFactoryId={currentFactoryId}
                  onNavigateToFactory={handleNavigateToFactory}
                />
              )}
            </div>
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
                onRebuild={rebuild}
                library={library}
                currentFactoryId={currentFactoryId}
                onNavigateToFactory={handleNavigateToFactory}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
