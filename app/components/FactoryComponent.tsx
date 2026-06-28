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
import { useEffect, useMemo, useRef, useState } from "react";
import Factory from "../models/factory";
import {
  CURRENT_SCHEMA_VERSION,
  collectFactoryBundle,
  deserializeFactory,
  generateId,
  migrateLibrary,
  type SerializedFactory,
  type StorageLibrary,
  serializeFactory,
} from "../models/factory-storage";
import type Part from "../models/part";
import {
  addFactory,
  clearAutosave,
  clearCurrentFactoryId,
  downloadJson,
  getAutosavePref,
  getCurrentFactoryId,
  hasConsent,
  loadLibrary,
  setCurrentFactoryId as persistCurrentFactoryId,
  readAutosave,
  saveLibrary,
  setAutosavePref,
  updateFactory,
  writeAutosave,
} from "../models/storage-service";
import FactoryHeader from "./FactoryHeader";
import FactoryLibraryDrawer from "./FactoryLibraryDrawer";
import FactoryOverviewComponent from "./FactoryOverviewComponent";
import LogisticsSection from "./LogisticsSection";
import OptimizationSection from "./OptimizationSection";
import PlanningSection from "./PlanningSection";
import StorageConsentDialog from "./StorageConsentDialog";

type Section = "planning" | "optimization" | "logistics";

type PendingAction = "save" | "openLibrary" | null;

const AUTOSAVE_DEBOUNCE_MS = 400;

export default function FactoryComponent() {
  const [activeSection, setActiveSection] = useState<Section>("planning");
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);
  const [libraryPinned, setLibraryPinned] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );

  const factoryRef = useRef<Factory>(new Factory());
  const factory = factoryRef.current;
  const [, setVersion] = useState(0);

  const [factoryName, setFactoryName] = useState("Unnamed Factory");
  const [currentFactoryId, setCurrentFactoryId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const autosaveEnabledRef = useRef(true);
  const doSaveRef = useRef<() => void>(() => {});
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildSerializedRef = useRef<
    (overrideName?: string) => SerializedFactory
  >(() => ({}) as SerializedFactory);
  const flushAutosaveRef = useRef<() => void>(() => {});

  const [library, setLibrary] = useState<StorageLibrary>({
    schemaVersion: 1,
    folders: [],
    factories: [],
  });
  const [libraryOpen, setLibraryOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
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

  factory.update = () => {
    factory._updateRates();
    setIsDirty(true);
    setVersion((v) => v + 1);
    scheduleAutosave();
  };

  function buildSerialized(overrideName?: string): SerializedFactory {
    const now = new Date().toISOString();
    return serializeFactory(factory, {
      id: currentFactoryId ?? generateId(),
      name: overrideName ?? factoryName,
      folderId: currentFolderId,
      createdAt: createdAt || now,
      updatedAt: now,
    });
  }

  // Persisting on every edit serializes the whole library to localStorage (and,
  // when autosave is on, re-derives other factories). Debounce it so a burst of
  // edits coalesces into one write. Refs keep the fired callback current.
  buildSerializedRef.current = buildSerialized;

  function flushAutosave() {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (!hasConsent()) return;
    if (autosaveEnabledRef.current) {
      doSaveRef.current();
    } else {
      writeAutosave(buildSerializedRef.current());
    }
  }
  flushAutosaveRef.current = flushAutosave;

  function scheduleAutosave() {
    if (!hasConsent()) return;
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      flushAutosaveRef.current();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  // On mount: load library and restore session if consent given
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (hasConsent()) {
      const pref = getAutosavePref();
      setAutosaveEnabled(pref);
      autosaveEnabledRef.current = pref;
    }

    if (!hasConsent()) return;
    const lib = loadLibrary();
    setLibrary(lib);

    const autosaved = readAutosave();
    if (autosaved) {
      // Unsaved changes take priority
      const restored = deserializeFactory(autosaved, lib);
      if (restored) {
        factoryRef.current = restored;
        restored.update = factory.update;
        setFactoryName(autosaved.name);
        setCurrentFactoryId(autosaved.id);
        setCurrentFolderId(autosaved.folderId);
        setCreatedAt(autosaved.createdAt);
        setIsDirty(true);
        setVersion((v) => v + 1);
        if (!lib.factories.find((f) => f.id === autosaved.id)) {
          setAutosaveEnabled(false);
          autosaveEnabledRef.current = false;
        }
        return;
      }
    }

    // No autosave — reload last saved factory from library
    const lastId = getCurrentFactoryId();
    if (lastId) {
      const saved = lib.factories.find((f) => f.id === lastId);
      if (saved) {
        const restored = deserializeFactory(saved, lib);
        if (restored) {
          factoryRef.current = restored;
          restored.update = factory.update;
          setFactoryName(saved.name);
          setCurrentFactoryId(saved.id);
          setCurrentFolderId(saved.folderId);
          setCreatedAt(saved.createdAt);
          setIsDirty(false);
          setVersion((v) => v + 1);
        }
      }
    }
  }, []);

  // Flush any pending debounced autosave before the tab closes or the component
  // unmounts, so the last burst of edits isn't lost.
  useEffect(() => {
    const onBeforeUnload = () => flushAutosaveRef.current();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      flushAutosaveRef.current();
    };
  }, []);

  function rebuildFactory() {
    factoryRef.current = new Factory(factoryRef.current);
    setVersion((v) => v + 1);
  }

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

  // --- Consent gate ---

  function requireConsent(action: PendingAction) {
    if (hasConsent()) {
      executePendingAction(action);
    } else {
      setPendingAction(action);
      setConsentOpen(true);
    }
  }

  function handleOpenLibrary() {
    if (libraryOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const lib = loadLibrary();
    setLibrary(lib);
    setLibraryOpen(true);
  }

  function handleCloseLibrary() {
    setLibraryOpen(false);
    requestAnimationFrame(() => {
      previousFocusRef.current?.focus();
    });
  }

  function executePendingAction(action: PendingAction) {
    if (action === "save") {
      doSave();
    } else if (action === "openLibrary") {
      handleOpenLibrary();
    }
  }

  function handleConsentAllow() {
    setConsentOpen(false);
    const lib = loadLibrary();
    setLibrary(lib);
    executePendingAction(pendingAction);
    setPendingAction(null);
  }

  function handleConsentCancel() {
    setConsentOpen(false);
    setPendingAction(null);
  }

  // --- Save ---

  // Keep ref current so factory.update (which closes over the ref) always calls the latest doSave
  doSaveRef.current = doSave;

  function enableAutosave() {
    setAutosaveEnabled(true);
    autosaveEnabledRef.current = true;
    if (hasConsent()) setAutosavePref(true);
  }

  function doSave() {
    // An explicit/flushed save supersedes any pending debounced autosave.
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const now = new Date().toISOString();
    const id = currentFactoryId ?? generateId();
    const isFirstSave = !currentFactoryId;
    if (!currentFactoryId) {
      setCurrentFactoryId(id);
      setCreatedAt(now);
    }

    const serialized = serializeFactory(factory, {
      id,
      name: factoryName,
      folderId: currentFolderId,
      createdAt: currentFactoryId ? createdAt : now,
      updatedAt: now,
    });

    const existingEntry = library.factories.find((f) => f.id === id);
    if (currentFactoryId && !existingEntry) {
      // Factory was deleted from the library while loaded — save as a new entry
      const newId = generateId();
      setCurrentFactoryId(newId);
      setCreatedAt(now);
      const reserialised = serializeFactory(factory, {
        id: newId,
        name: factoryName,
        folderId: currentFolderId,
        createdAt: now,
        updatedAt: now,
      });
      const updatedLib = addFactory(library, reserialised);
      saveLibrary(updatedLib);
      clearAutosave();
      persistCurrentFactoryId(newId);
      setLibrary(updatedLib);
      setIsDirty(false);
      if (isFirstSave) enableAutosave();
      return;
    }
    const updatedLib = existingEntry
      ? updateFactory(library, serialized)
      : addFactory(library, serialized);

    saveLibrary(updatedLib);
    clearAutosave();
    persistCurrentFactoryId(id);
    setLibrary(updatedLib);
    setIsDirty(false);
    if (isFirstSave) enableAutosave();
  }

  function handleSave() {
    requireConsent("save");
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
    downloadJson(bundle, `${factoryName.replace(/[^a-z0-9]/gi, "_")}.json`);
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

  // Migrate incoming data (hoists any legacy embedded factories), then assign
  // fresh ids while preserving every cross-reference (folder parent, supplier,
  // nested recipe). Returns the remapped entries plus the id mapping.
  function remapImportedLibrary(data: StorageLibrary): {
    folders: StorageLibrary["folders"];
    factories: SerializedFactory[];
    idMap: Map<string, string>;
  } {
    const migrated = migrateLibrary(data);
    const now = new Date().toISOString();
    const idMap = new Map<string, string>();
    for (const folder of migrated.folders) idMap.set(folder.id, generateId());
    for (const f of migrated.factories) idMap.set(f.id, generateId());

    const folders = migrated.folders.map((f) => ({
      ...f,
      id: idMap.get(f.id) ?? generateId(),
      parentId: f.parentId ? (idMap.get(f.parentId) ?? null) : null,
    }));
    const factories = migrated.factories.map((f) => ({
      ...f,
      id: idMap.get(f.id) ?? generateId(),
      folderId: f.folderId ? (idMap.get(f.folderId) ?? null) : null,
      supplierIds: f.supplierIds?.map((sid) => idMap.get(sid) ?? sid),
      createdAt: now,
      updatedAt: now,
      productionLines: f.productionLines.map((pl) => ({
        ...pl,
        assemblyLines: pl.assemblyLines.map((al) => ({
          ...al,
          nestedFactoryId: al.nestedFactoryId
            ? (idMap.get(al.nestedFactoryId) ?? al.nestedFactoryId)
            : undefined,
        })),
      })),
    }));
    return { folders, factories, idMap };
  }

  // Legacy single-factory files (schema <= 3) may embed nested factories. Run
  // them through the same bundle path so embedded copies become independent
  // entries, then load the imported factory.
  function importSingleFactory(data: SerializedFactory) {
    const { folders, factories, idMap } = remapImportedLibrary({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      folders: [],
      factories: [data],
    });
    const rootId = idMap.get(data.id);
    const root = factories.find((f) => f.id === rootId);
    if (!root) return;

    const updatedLib: StorageLibrary = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      folders: [...library.folders, ...folders],
      factories: [...library.factories, ...factories],
    };
    if (hasConsent()) {
      saveLibrary(updatedLib);
      setLibrary(updatedLib);
    }

    // Resolve nested references against the freshly merged library, not the
    // stale state snapshot.
    loadFactoryFromSerialized(root, updatedLib);
  }

  function importLibrary(data: StorageLibrary) {
    if (!hasConsent()) {
      requireConsent("openLibrary");
      return;
    }

    const { folders, factories, idMap } = remapImportedLibrary(data);
    const updatedLib: StorageLibrary = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      folders: [...library.folders, ...folders],
      factories: [...library.factories, ...factories],
    };
    saveLibrary(updatedLib);
    setLibrary(updatedLib);

    // Exported bundles carry the root factory's id — load it directly (resolving
    // references against the freshly merged library) instead of opening the drawer.
    const newRootId = data.rootId ? idMap.get(data.rootId) : undefined;
    const root = newRootId
      ? factories.find((f) => f.id === newRootId)
      : undefined;
    if (root) {
      loadFactoryFromSerialized(root, updatedLib);
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
      loadFactoryFromSerialized(serialized);
      setLibraryOpen(false);
    }
  }

  function loadFactoryFromSerialized(
    serialized: SerializedFactory,
    lib: StorageLibrary = library,
  ) {
    const loaded = deserializeFactory(serialized, lib);
    if (!loaded) {
      alert(
        "Could not restore factory — some recipe or part data may be missing.",
      );
      return;
    }
    factoryRef.current = loaded;
    setFactoryName(serialized.name);
    setCurrentFactoryId(serialized.id);
    setCurrentFolderId(serialized.folderId);
    setCreatedAt(serialized.createdAt);
    setIsDirty(false);
    setVersion((v) => v + 1);
    persistCurrentFactoryId(serialized.id);
  }

  function handleUnsavedSaveAndLoad() {
    doSave();
    if (pendingLoadFactory) {
      loadFactoryFromSerialized(pendingLoadFactory);
      setLibraryOpen(false);
    }
    setUnsavedPromptOpen(false);
    setPendingLoadFactory(null);
  }

  function handleUnsavedDiscardAndLoad() {
    if (pendingLoadFactory) {
      loadFactoryFromSerialized(pendingLoadFactory);
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
        doSave();
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
    factoryRef.current = new Factory();
    setFactoryName("Unnamed Factory");
    setCurrentFactoryId(null);
    setCurrentFolderId(folderId);
    setCreatedAt("");
    setIsDirty(false);
    clearCurrentFactoryId();
    setVersion((v) => v + 1);
    setLibraryOpen(false);
    setAutosaveEnabled(false);
    autosaveEnabledRef.current = false;
  }

  function handleClearSaveAndContinue() {
    if (hasConsent()) doSave();
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

  function handleResizeDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragStateRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragStateRef.current) return;
      const delta = dragStateRef.current.startX - ev.clientX;
      const newWidth = Math.max(
        200,
        Math.min(700, dragStateRef.current.startWidth + delta),
      );
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      dragStateRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function handleToggleAutosave() {
    const next = !autosaveEnabled;
    setAutosaveEnabled(next);
    autosaveEnabledRef.current = next;
    if (hasConsent()) setAutosavePref(next);
  }

  function handleFactoryNameChange(name: string) {
    setFactoryName(name);
    setIsDirty(true);
  }

  function handleIconChange(icon: string | undefined) {
    factory.icon = icon;
    factory.update();
  }

  const currentFactory = factoryRef.current;

  return (
    <>
      <StorageConsentDialog
        open={consentOpen}
        onAllow={handleConsentAllow}
        onCancel={handleConsentCancel}
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
          onPinChange={setLibraryPinned}
        />
      )}

      <Dialog
        open={unsavedPromptOpen}
        onClose={handleUnsavedCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogContent>
          You have unsaved changes in the current factory. What would you like
          to do?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUnsavedCancel}>Cancel</Button>
          <Button onClick={handleUnsavedDiscardAndLoad}>
            Discard &amp; load
          </Button>
          <Button onClick={handleUnsavedSaveAndLoad} variant="contained">
            Save &amp; load
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog
        open={clearConfirmOpen}
        onClose={handleClearCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Clear factory?</DialogTitle>
        <DialogContent>
          You have unsaved changes in the current factory. What would you like
          to do?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClearCancel}>Cancel</Button>
          <Button onClick={handleClearDiscardAndContinue}>
            Discard &amp; clear
          </Button>
          <Button onClick={handleClearSaveAndContinue} variant="contained">
            Save &amp; clear
          </Button>
        </DialogActions>
      </Dialog>

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
            onPinChange={setLibraryPinned}
          />
        )}
        <div
          className={`flex flex-col min-h-full grow ${libraryPinned ? "min-w-0" : "min-w-full"}`}
        >
          <FactoryHeader
            factoryName={factoryName}
            factoryIcon={currentFactory.icon}
            isDirty={isDirty}
            autosaveEnabled={autosaveEnabled}
            onNameChange={handleFactoryNameChange}
            onIconChange={handleIconChange}
            onOpenLibrary={() => requireConsent("openLibrary")}
            onSave={handleSave}
            onToggleAutosave={handleToggleAutosave}
            onExport={handleExportCurrent}
            onImport={handleImport}
            onNewFactory={() => handleNewFactory(null)}
            onViewJson={() => setJsonDialogOpen(true)}
            onExpandAll={() => setForceExpanded(true)}
            onCollapseAll={() => setForceExpanded(false)}
            productionLineCount={currentFactory.productionLines.length}
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

          {currentFactory.solverError && (
            <Alert severity="warning" className="m-2 text-sm">
              {currentFactory.solverError}
            </Alert>
          )}

          <div className="flex flex-row grow">
            <div className="flex flex-col grow min-w-0">
              {activeSection === "planning" && (
                <PlanningSection
                  factory={currentFactory}
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
                  factory={currentFactory}
                  library={library}
                  currentFactoryId={currentFactoryId}
                />
              )}
              {activeSection === "logistics" && (
                <LogisticsSection factory={currentFactory} />
              )}
            </div>
            <div
              className="w-1.5 cursor-ew-resize flex-none hover:bg-blue-500/40 bg-black/20 dark:bg-white/20 min-h-full transition-colors"
              onMouseDown={handleResizeDividerMouseDown}
            />
            <div
              style={{ width: sidebarWidth }}
              className="flex-none overflow-y-auto"
            >
              <FactoryOverviewComponent
                factory={currentFactory}
                onRebuild={rebuildFactory}
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
