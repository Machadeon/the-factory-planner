"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { withBasePath } from "../lib/base-path";
import {
  deserializeFactory,
  type SerializedFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import {
  getCurrentFactoryId,
  hasConsent,
  readAutosave,
} from "../models/storage-service";
import type { LoadSerializedOptions } from "./useFactorySession";

export type Section = "planning" | "optimization" | "logistics";

const VALID_SECTIONS: Section[] = ["planning", "optimization", "logistics"];

interface UrlSyncSession {
  loadSerialized: (
    sf: SerializedFactory,
    lib: StorageLibrary,
    opts?: LoadSerializedOptions,
  ) => boolean;
  clearTo: (folderId: string | null) => void;
  currentFactoryId: string | null;
  currentSlug: string | null;
}

interface UseFactoryUrlSyncDeps {
  session: UrlSyncSession;
  libraryApi: { reload: () => StorageLibrary };
  activeSection: Section;
  setActiveSection: (s: Section) => void;
  // Fired when the mount restore came from an autosave entry whose id is
  // absent from the library (caller disables autosave, pref untouched).
  onOrphanAutosaveRestore?: () => void;
}

// URL/history synchronization: hash ↔ tab sync, pushState on factory switch,
// popstate restore with forward-stack preservation, and the restore-on-mount
// priority chain (URL param → autosave → lastId). Restores delegate to the
// session's loadSerialized — no duplicated restore logic here.
export default function useFactoryUrlSync({
  session,
  libraryApi,
  activeSection,
  setActiveSection,
  onOrphanAutosaveRestore,
}: UseFactoryUrlSyncDeps) {
  const hashSyncInitialized = useRef(false);
  // Captured during render, before any layout effects can overwrite window.location.
  const initialHashRef = useRef<string>(
    typeof window !== "undefined" ? window.location.hash.slice(1) : "",
  );
  // Same reason: the factory URL layout effect fires on mount (currentFactoryId=null)
  // and pushes "/" before the mount restore can read window.location.search.
  const initialSearchRef = useRef<string>(
    typeof window !== "undefined" ? window.location.search : "",
  );
  // Always-current ref so the factory URL layout effect can include the active
  // section hash without adding activeSection to its dependency array (which
  // would create a history entry on every tab switch).
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;
  // Set true in popstate handler to stop the URL-sync effect from pushing a
  // new history entry (which would destroy the forward stack).
  const suppressNextUrlPush = useRef(false);

  // Latest-callback refs so the mount-once popstate listener never goes stale.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const reloadRef = useRef(libraryApi.reload);
  reloadRef.current = libraryApi.reload;
  const setActiveSectionRef = useRef(setActiveSection);
  setActiveSectionRef.current = setActiveSection;
  const onOrphanRef = useRef(onOrphanAutosaveRestore);
  onOrphanRef.current = onOrphanAutosaveRestore;

  // Restore priority: URL param → autosave → last saved factory. All three
  // delegate to loadSerialized; deserialization is pre-flighted so a corrupt
  // entry falls through silently instead of alerting.
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
      sessionRef.current.loadSerialized(saved, lib);
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
      sessionRef.current.loadSerialized(autosaved, lib, {
        markDirty: true,
        backfillSlug: false,
        persistCurrentId: false,
      });
      if (!lib.factories.find((f) => f.id === autosaved.id)) {
        onOrphanRef.current?.();
      }
      return true;
    }

    // Priority 3: last saved factory from localStorage
    const lastId = getCurrentFactoryId();
    if (lastId) {
      const saved = lib.factories.find((f) => f.id === lastId);
      if (saved && deserializeFactory(saved, lib)) {
        sessionRef.current.loadSerialized(saved, lib);
        return true;
      }
    }
    return false;
  }

  // On mount: restore session if consent given. A fresh session already has a
  // generated name (useFactorySession).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (!hasConsent()) return;
    restoreFactory(reloadRef.current());
  }, []);

  // Read initial tab from hash on mount. Uses initialHashRef (captured at render
  // time) because layout effects have already overwritten window.location by now.
  useEffect(() => {
    const hash = initialHashRef.current;
    if (VALID_SECTIONS.includes(hash as Section)) {
      setActiveSectionRef.current(hash as Section);
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
    if (!session.currentFactoryId) {
      window.history.pushState({ factoryId: null }, "", withBasePath("/"));
    } else {
      const base = session.currentSlug
        ? `/?factory=${encodeURIComponent(session.currentSlug)}`
        : `/?factoryId=${encodeURIComponent(session.currentFactoryId)}`;
      window.history.pushState(
        { factoryId: session.currentFactoryId, slug: session.currentSlug },
        "",
        withBasePath(`${base}${hash}`),
      );
    }
  }, [session.currentFactoryId, session.currentSlug]);

  // Listen for back/forward navigation and switch to the factory in the URL.
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const id = e.state?.factoryId as string | null | undefined;
      const lib = reloadRef.current();
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
      setActiveSectionRef.current(
        VALID_SECTIONS.includes(sectionHash as Section)
          ? (sectionHash as Section)
          : "planning",
      );

      if (target) {
        if (deserializeFactory(target, lib)) {
          sessionRef.current.loadSerialized(target, lib);
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
        if (savedByUrl && deserializeFactory(savedByUrl, lib)) {
          sessionRef.current.loadSerialized(savedByUrl, lib);
          return;
        }
        // Navigated back to clean URL — treat as a new empty factory
        sessionRef.current.clearTo(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}
