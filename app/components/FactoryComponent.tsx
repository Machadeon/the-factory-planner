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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Factory from "../models/factory";
import {
  CURRENT_SCHEMA_VERSION,
  collectFactoryBundle,
  deserializeFactory,
  generateId,
  generateSlug,
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
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );

  const factoryRef = useRef<Factory>(new Factory());
  const factory = factoryRef.current;
  const [, setVersion] = useState(0);

  const [factoryName, setFactoryName] = useState("Unnamed Factory");
  const [currentFactoryId, setCurrentFactoryId] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  // Set true in popstate handler to stop URL-sync effect from pushing a new
  // history entry (which would destroy the forward stack).
  const suppressNextUrlPush = useRef(false);

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
      slug: currentSlug ?? undefined,
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
    if (autosaveTimerRef.current === null) return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
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

  // If a saved factory has no slug, generate one and persist it so the URL
  // immediately shows a human-readable slug instead of the raw UUID.
  function ensureSlug(
    sf: SerializedFactory,
    lib: StorageLibrary,
  ): { slug: string; lib: StorageLibrary } {
    if (sf.slug) return { slug: sf.slug, lib };
    const existingSlugs = lib.factories.flatMap((f) =>
      f.slug && f.id !== sf.id ? [f.slug] : [],
    );
    const slug = generateSlug(sf.name, existingSlugs);
    const withSlug = { ...sf, slug };
    const updatedLib = updateFactory(lib, withSlug);
    saveLibrary(updatedLib);
    return { slug, lib: updatedLib };
  }

  // Load a factory from a serialized entry, falling back to autosave then lastId.
  // Priority: ?factory= (slug) or ?factoryId= URL param → autosave → localStorage last factory.
  function restoreFactory(lib: StorageLibrary) {
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
    if (saved) {
      const restored = deserializeFactory(saved, lib);
      if (restored) {
        const { slug, lib: updatedLib } = ensureSlug(saved, lib);
        factoryRef.current = restored;
        restored.update = factory.update;
        setFactoryName(saved.name);
        setCurrentFactoryId(saved.id);
        setCurrentSlug(slug);
        setCurrentFolderId(saved.folderId);
        setCreatedAt(saved.createdAt);
        setIsDirty(false);
        setVersion((v) => v + 1);
        setLibrary(updatedLib);
        persistCurrentFactoryId(saved.id);
        // Stamp history state so popstate carries the factoryId
        window.history.replaceState(
          { factoryId: saved.id, slug },
          "",
          window.location.href,
        );
        return;
      }
    }

    // Priority 2: unsaved autosave
    const autosaved = readAutosave();
    if (autosaved) {
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

    // Priority 3: last saved factory from localStorage
    const lastId = getCurrentFactoryId();
    if (lastId) {
      const saved = lib.factories.find((f) => f.id === lastId);
      if (saved) {
        const restored = deserializeFactory(saved, lib);
        if (restored) {
          const { slug, lib: updatedLib } = ensureSlug(saved, lib);
          factoryRef.current = restored;
          restored.update = factory.update;
          setFactoryName(saved.name);
          setCurrentFactoryId(saved.id);
          setCurrentSlug(slug);
          setCurrentFolderId(saved.folderId);
          setCreatedAt(saved.createdAt);
          setIsDirty(false);
          setVersion((v) => v + 1);
          setLibrary(updatedLib);
        }
      }
    }
  }

  // On mount: load library and restore session if consent given.
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

    // Restore from URL or session. Extracted so the popstate handler can reuse it.
    restoreFactory(lib);
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
      window.history.pushState({ factoryId: null }, "", "/");
    } else {
      const base = currentSlug
        ? `/?factory=${encodeURIComponent(currentSlug)}`
        : `/?factoryId=${encodeURIComponent(currentFactoryId)}`;
      window.history.pushState(
        { factoryId: currentFactoryId, slug: currentSlug },
        "",
        `${base}${hash}`,
      );
    }
  }, [currentFactoryId, currentSlug]);

  // Listen for back/forward navigation and switch to the factory in the URL.
  // biome-ignore lint/correctness/useExhaustiveDependencies: library captured by ref
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const id = e.state?.factoryId as string | null | undefined;
      const lib = loadLibrary();
      setLibrary(lib);
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
        const restored = deserializeFactory(target, lib);
        if (restored) {
          factoryRef.current = restored;
          setFactoryName(target.name);
          setCurrentFactoryId(target.id);
          setCurrentSlug(target.slug ?? null);
          setCurrentFolderId(target.folderId);
          setCreatedAt(target.createdAt);
          setIsDirty(false);
          setVersion((v) => v + 1);
          persistCurrentFactoryId(target.id);
        }
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
        if (savedByUrl) {
          const restored = deserializeFactory(savedByUrl, lib);
          if (restored) {
            const { slug, lib: updatedLib } = ensureSlug(savedByUrl, lib);
            factoryRef.current = restored;
            setFactoryName(savedByUrl.name);
            setCurrentFactoryId(savedByUrl.id);
            setCurrentSlug(slug);
            setCurrentFolderId(savedByUrl.folderId);
            setCreatedAt(savedByUrl.createdAt);
            setIsDirty(false);
            setVersion((v) => v + 1);
            setLibrary(updatedLib);
            persistCurrentFactoryId(savedByUrl.id);
            return;
          }
        }
        // Navigated back to clean URL — treat as a new empty factory
        factoryRef.current = new Factory();
        setFactoryName("Unnamed Factory");
        setCurrentFactoryId(null);
        setCurrentSlug(null);
        setCurrentFolderId(null);
        setCreatedAt("");
        setIsDirty(false);
        setVersion((v) => v + 1);
        clearCurrentFactoryId();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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

    // Assign a slug on first save (or if the loaded factory predates slugs).
    // Slug is stable: never regenerated on rename so bookmarks don't break.
    const existingSlugs = library.factories
      .filter((f) => f.id !== id)
      .flatMap((f) => (f.slug ? [f.slug] : []));
    const slug = currentSlug ?? generateSlug(factoryName, existingSlugs);
    if (!currentSlug) setCurrentSlug(slug);

    const existingEntry = library.factories.find((f) => f.id === id);

    if (currentFactoryId && !existingEntry) {
      // Factory was deleted from the library while loaded — save as a new entry
      const newId = generateId();
      const newSlug = generateSlug(
        factoryName,
        library.factories.flatMap((f) => (f.slug ? [f.slug] : [])),
      );
      setCurrentFactoryId(newId);
      setCurrentSlug(newSlug);
      setCreatedAt(now);
      const reserialised = serializeFactory(factory, {
        id: newId,
        slug: newSlug,
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

    const serialized = serializeFactory(factory, {
      id,
      slug,
      name: factoryName,
      folderId: currentFolderId,
      createdAt: currentFactoryId ? createdAt : now,
      updatedAt: now,
    });
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
    const { slug, lib: updatedLib } = ensureSlug(serialized, lib);
    factoryRef.current = loaded;
    setFactoryName(serialized.name);
    setCurrentFactoryId(serialized.id);
    setCurrentSlug(slug);
    setCurrentFolderId(serialized.folderId);
    setCreatedAt(serialized.createdAt);
    setIsDirty(false);
    setVersion((v) => v + 1);
    setLibrary(updatedLib);
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
    setCurrentSlug(null);
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

  function handleUpdateGlobalPointOverrides(overrides: Record<string, number>) {
    if (!library) return;
    const updatedLib = { ...library, partPointOverrides: overrides };
    setLibrary(updatedLib);
    saveLibrary(updatedLib);
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
                  onUpdateLibrary={handleUpdateGlobalPointOverrides}
                />
              )}
              {activeSection === "logistics" && (
                <LogisticsSection
                  factory={currentFactory}
                  library={library}
                  currentFactoryId={currentFactoryId}
                  onNavigateToFactory={handleNavigateToFactory}
                />
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
