"use client";

import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Factory from "../models/factory";
import {
  deserializeFactory,
  generateId,
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
import Clickable from "./Clickable";
import { HorizontalDivider, VerticalDivider } from "./Dividers";
import FactoryHeader from "./FactoryHeader";
import FactoryLibraryDrawer from "./FactoryLibraryDrawer";
import FactoryOverviewComponent from "./FactoryOverviewComponent";
import PartSelector from "./PartSelector";
import ProductionLineComponent from "./ProductionLineComponent";
import StorageConsentDialog from "./StorageConsentDialog";

type PendingAction = "save" | "openLibrary" | null;

export default function FactoryComponent() {
  const [addingProduct, setAddingProduct] = useState(false);
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);

  const factoryRef = useRef<Factory>(new Factory());
  const factory = factoryRef.current;
  const [version, setVersion] = useState(0);

  const [factoryName, setFactoryName] = useState("Unnamed Factory");
  const [currentFactoryId, setCurrentFactoryId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const autosaveEnabledRef = useRef(true);
  const doSaveRef = useRef<() => void>(() => {});

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
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const prevSolverErrorRef = useRef<string | null | undefined>(undefined);

  factory.update = () => {
    factory._updateRates();
    setIsDirty(true);
    setVersion((v) => v + 1);
    if (hasConsent()) {
      if (autosaveEnabledRef.current) {
        doSaveRef.current();
      } else {
        writeAutosave(buildSerialized());
      }
    }
  };

  function buildSerialized(overrideName?: string): SerializedFactory {
    const now = new Date().toISOString();
    return serializeFactory(
      factory,
      {
        id: currentFactoryId ?? generateId(),
        name: overrideName ?? factoryName,
        folderId: currentFolderId,
        createdAt: createdAt || now,
        updatedAt: now,
      },
      library,
    );
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
    setAddingProduct(false);
  }

  // Stable so memoized ProductionLineComponents aren't re-rendered by a new
  // callback identity on unrelated parent re-renders. factory is a ref, stable.
  const removeProductionLine = useCallback(
    (part: Part) => {
      factory.removeProductionLine(part);
    },
    [factory],
  );

  // Stable identity backed by a ref holding the latest impl, so we don't have
  // to memoize the whole handleLoadFactory chain it depends on.
  const navigateToFactoryRef = useRef<(id: string) => void>(() => {});
  const handleNavigateToFactory = useCallback(
    (id: string) => navigateToFactoryRef.current(id),
    [],
  );

  // Released the expand/collapse-all override when a single row is toggled.
  const handleRowToggle = useCallback(() => setForceExpanded(null), []);

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
    const now = new Date().toISOString();
    const id = currentFactoryId ?? generateId();
    const isFirstSave = !currentFactoryId;
    if (!currentFactoryId) {
      setCurrentFactoryId(id);
      setCreatedAt(now);
    }

    const serialized = serializeFactory(
      factory,
      {
        id,
        name: factoryName,
        folderId: currentFolderId,
        createdAt: currentFactoryId ? createdAt : now,
        updatedAt: now,
      },
      library,
    );

    const existingEntry = library.factories.find((f) => f.id === id);
    if (currentFactoryId && !existingEntry) {
      // Factory was deleted from the library while loaded — save as a new entry
      const newId = generateId();
      setCurrentFactoryId(newId);
      setCreatedAt(now);
      const reserialised = serializeFactory(
        factory,
        {
          id: newId,
          name: factoryName,
          folderId: currentFolderId,
          createdAt: now,
          updatedAt: now,
        },
        library,
      );
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
    const serialized = buildSerialized();
    downloadJson(serialized, `${factoryName.replace(/[^a-z0-9]/gi, "_")}.json`);
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

  function importSingleFactory(data: SerializedFactory) {
    const now = new Date().toISOString();
    const withNewId: SerializedFactory = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const lib = hasConsent()
      ? library
      : { schemaVersion: 1 as const, folders: [], factories: [] };
    const updatedLib = addFactory(lib, withNewId);

    if (hasConsent()) {
      saveLibrary(updatedLib);
      setLibrary(updatedLib);
    }

    loadFactoryFromSerialized(withNewId);
  }

  function importLibrary(data: StorageLibrary) {
    if (!hasConsent()) {
      requireConsent("openLibrary");
      return;
    }

    const now = new Date().toISOString();
    const idMap = new Map<string, string>();
    for (const folder of data.folders) {
      idMap.set(folder.id, generateId());
    }
    for (const factory of data.factories) {
      idMap.set(factory.id, generateId());
    }

    const newFolders = data.folders.map((f) => ({
      ...f,
      id: idMap.get(f.id) ?? generateId(),
      parentId: f.parentId ? (idMap.get(f.parentId) ?? null) : null,
    }));
    const newFactories = data.factories.map((f) => ({
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

    const updatedLib: StorageLibrary = {
      schemaVersion: 1,
      folders: [...library.folders, ...newFolders],
      factories: [...library.factories, ...newFactories],
    };
    saveLibrary(updatedLib);
    setLibrary(updatedLib);
    handleOpenLibrary();
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

  function loadFactoryFromSerialized(serialized: SerializedFactory) {
    const loaded = deserializeFactory(serialized, library);
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

  navigateToFactoryRef.current = (id: string) => {
    const sf = library.factories.find((f) => f.id === id);
    if (sf) handleLoadFactory(sf);
  };

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

  if (prevSolverErrorRef.current !== currentFactory.solverError) {
    if (
      prevSolverErrorRef.current !== undefined &&
      currentFactory.solverError !== null
    ) {
      setDismissedError(null);
    }
    prevSolverErrorRef.current = currentFactory.solverError;
  }

  return (
    <>
      <StorageConsentDialog
        open={consentOpen}
        onAllow={handleConsentAllow}
        onCancel={handleConsentCancel}
      />

      <FactoryLibraryDrawer
        open={libraryOpen}
        onClose={handleCloseLibrary}
        library={library}
        currentFactoryId={currentFactoryId}
        onLibraryChange={setLibrary}
        onLoadFactory={handleLoadFactory}
        onNewFactory={handleNewFactory}
        onImport={handleImport}
      />

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

      <div className="flex flex-col min-w-full min-h-full grow">
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
        />

        <div className="flex flex-row grow">
          <div className="flex flex-col grow">
            {currentFactory.solverError &&
              currentFactory.solverError !== dismissedError && (
                <Alert
                  severity="warning"
                  className="m-2 text-sm"
                  onClose={() =>
                    setDismissedError(currentFactory.solverError ?? null)
                  }
                >
                  {currentFactory.solverError}
                </Alert>
              )}
            {currentFactory.productionLines.length === 0 ? (
              <>
                <p className="p-4">Add a product to get started</p>
                <HorizontalDivider />
              </>
            ) : (
              <>
                <div className="flex flex-row items-center gap-1 px-3 py-1 border-b border-[rgba(128,128,128,0.2)]">
                  <Tooltip title="Expand all">
                    <span>
                      <Clickable
                        className="p-1"
                        onClick={() =>
                          startTransition(() => setForceExpanded(true))
                        }
                      >
                        <KeyboardArrowDownIcon fontSize="small" />
                      </Clickable>
                    </span>
                  </Tooltip>
                  <Tooltip title="Collapse all">
                    <span>
                      <Clickable
                        className="p-1"
                        onClick={() =>
                          startTransition(() => setForceExpanded(false))
                        }
                      >
                        <KeyboardArrowRightIcon fontSize="small" />
                      </Clickable>
                    </span>
                  </Tooltip>
                </div>
                {currentFactory.productionLines.map((product) => (
                  <div key={product.part.slug} className="sp-production-line">
                    <ProductionLineComponent
                      productionLine={product}
                      factory={currentFactory}
                      library={library}
                      currentFactoryId={currentFactoryId}
                      onDelete={removeProductionLine}
                      forceExpanded={forceExpanded}
                      onToggle={handleRowToggle}
                      onNavigateToFactory={handleNavigateToFactory}
                      version={version}
                    />
                    <HorizontalDivider />
                  </div>
                ))}
              </>
            )}
            {addingProduct ? (
              <PartSelector
                existingParts={currentFactory.productionLines.map(
                  (p) => p.part.slug,
                )}
                onPartSelected={addProductionLine}
              />
            ) : (
              <Clickable
                className="flex min-w-full items-center p-4"
                onClick={() => setAddingProduct(true)}
              >
                <AddIcon />
                Add Product
              </Clickable>
            )}
          </div>
          <VerticalDivider />
          <FactoryOverviewComponent
            factory={currentFactory}
            onRebuild={rebuildFactory}
            library={library}
            currentFactoryId={currentFactoryId}
            onNavigateToFactory={handleNavigateToFactory}
          />
        </div>
      </div>
    </>
  );
}
