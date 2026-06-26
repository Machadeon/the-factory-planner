"use client";

import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
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
  const [, setVersion] = useState(0);

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
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);
  const [pendingLoadFactory, setPendingLoadFactory] =
    useState<SerializedFactory | null>(null);

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
    factory.addProductionLine(part);
    setAddingProduct(false);
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

  function executePendingAction(action: PendingAction) {
    if (action === "save") {
      doSave();
    } else if (action === "openLibrary") {
      const lib = loadLibrary();
      setLibrary(lib);
      setLibraryOpen(true);
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

  function doSave() {
    const now = new Date().toISOString();
    const id = currentFactoryId ?? generateId();
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
    const updatedLib = existingEntry
      ? updateFactory(library, serialized)
      : addFactory(library, serialized);

    saveLibrary(updatedLib);
    clearAutosave();
    persistCurrentFactoryId(id);
    setLibrary(updatedLib);
    setIsDirty(false);
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
    setLibraryOpen(true);
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
      // save current before creating new
      if (hasConsent()) doSave();
    }
    factoryRef.current = new Factory();
    setFactoryName("Unnamed Factory");
    setCurrentFactoryId(null);
    setCurrentFolderId(folderId);
    setCreatedAt("");
    setIsDirty(false);
    clearCurrentFactoryId();
    setVersion((v) => v + 1);
    setLibraryOpen(false);
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
    const next = !autosaveEnabled;
    setAutosaveEnabled(next);
    autosaveEnabledRef.current = next;
    if (hasConsent()) setAutosavePref(next);
  }

  function handleFactoryNameChange(name: string) {
    setFactoryName(name);
    setIsDirty(true);
  }

  const currentFactory = factoryRef.current;

  return (
    <>
      <StorageConsentDialog
        open={consentOpen}
        onAllow={handleConsentAllow}
        onCancel={handleConsentCancel}
      />

      <FactoryLibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
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

      <div className="flex flex-col min-w-full min-h-full grow">
        <FactoryHeader
          factoryName={factoryName}
          isDirty={isDirty}
          autosaveEnabled={autosaveEnabled}
          onNameChange={handleFactoryNameChange}
          onOpenLibrary={() => requireConsent("openLibrary")}
          onSave={handleSave}
          onToggleAutosave={handleToggleAutosave}
          onExport={handleExportCurrent}
          onImport={handleImport}
          onNewFactory={() => handleNewFactory(null)}
        />

        <div className="flex flex-row grow">
          <div className="flex flex-col grow">
            {currentFactory.solverError && (
              <Alert severity="warning" className="m-2 text-sm">
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
                        onClick={() => setForceExpanded(true)}
                      >
                        <KeyboardArrowDownIcon fontSize="small" />
                      </Clickable>
                    </span>
                  </Tooltip>
                  <Tooltip title="Collapse all">
                    <span>
                      <Clickable
                        className="p-1"
                        onClick={() => setForceExpanded(false)}
                      >
                        <KeyboardArrowRightIcon fontSize="small" />
                      </Clickable>
                    </span>
                  </Tooltip>
                </div>
                {currentFactory.productionLines.map((product) => (
                  <div key={product.part.slug}>
                    <ProductionLineComponent
                      productionLine={product}
                      factory={currentFactory}
                      library={library}
                      currentFactoryId={currentFactoryId}
                      onDeleteClicked={() => removeProductionLine(product.part)}
                      forceExpanded={forceExpanded}
                      onToggle={() => setForceExpanded(null)}
                      onNavigateToFactory={handleNavigateToFactory}
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
