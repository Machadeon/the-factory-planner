"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SerializedFactory } from "../models/factory-storage";
import {
  getAutosavePref,
  hasConsent,
  setAutosavePref,
  writeAutosave,
} from "../models/storage-service";

const AUTOSAVE_DEBOUNCE_MS = 400;

interface UseAutosaveDeps {
  // Mute-aware mutation seam from useFactorySession.
  onFactoryMutate: (cb: () => void) => () => void;
  // Session swap signal: cancels a stale timer so it never writes the
  // previous factory after a load/clear.
  onSessionSwap?: (cb: () => void) => () => void;
  buildSerialized: () => SerializedFactory;
  doSave: () => void;
}

// Consent-aware debounced autosave. Persisting on every edit serializes the
// whole library to localStorage; debouncing coalesces a burst of edits into
// one write. Autosave enabled → full library save; disabled → autosave slot.
export default function useAutosave({
  onFactoryMutate,
  onSessionSwap,
  buildSerialized,
  doSave,
}: UseAutosaveDeps) {
  const [autosaveEnabled, setEnabledState] = useState(true);
  const enabledRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildRef = useRef(buildSerialized);
  buildRef.current = buildSerialized;
  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  useEffect(() => {
    if (hasConsent()) {
      const pref = getAutosavePref();
      setEnabledState(pref);
      enabledRef.current = pref;
    }
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!hasConsent()) return;
    if (enabledRef.current) {
      doSaveRef.current();
    } else {
      writeAutosave(buildRef.current());
    }
  }, []);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    if (!hasConsent()) return;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    // flush clears the ref itself — nulling it first would make the
    // "nothing pending" guard short-circuit and never save.
    timerRef.current = setTimeout(() => {
      flushRef.current();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => onFactoryMutate(schedule), [onFactoryMutate, schedule]);

  useEffect(
    () => onSessionSwap?.(cancelPending),
    [onSessionSwap, cancelPending],
  );

  // Flush pending edits before the tab closes or the hook unmounts.
  useEffect(() => {
    const onBeforeUnload = () => flushRef.current();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      flushRef.current();
    };
  }, []);

  const setAutosaveEnabled = useCallback(
    (next: boolean, opts: { persist?: boolean } = {}) => {
      const { persist = true } = opts;
      setEnabledState(next);
      enabledRef.current = next;
      if (persist && hasConsent()) setAutosavePref(next);
    },
    [],
  );

  const enableAutosave = useCallback(
    () => setAutosaveEnabled(true),
    [setAutosaveEnabled],
  );

  return {
    autosaveEnabled,
    setAutosaveEnabled,
    enableAutosave,
    flush,
    cancelPending,
  };
}
