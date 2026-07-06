import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAutosave from "@/app/hooks/useAutosave";
import {
  CURRENT_SCHEMA_VERSION,
  type SerializedFactory,
} from "@/app/models/factory-storage";
import { installLocalStorageMock } from "../../helpers/local-storage-mock";

const serialized: SerializedFactory = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: "f-1",
  name: "Test",
  folderId: null,
  autoAddProductLines: false,
  productionLines: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeSeams() {
  const mutateListeners: Array<() => void> = [];
  const swapListeners: Array<() => void> = [];
  return {
    onFactoryMutate: (cb: () => void) => {
      mutateListeners.push(cb);
      return () => {};
    },
    onSessionSwap: (cb: () => void) => {
      swapListeners.push(cb);
      return () => {};
    },
    emitMutate: () => {
      for (const cb of mutateListeners) cb();
    },
    emitSwap: () => {
      for (const cb of swapListeners) cb();
    },
  };
}

function mount(overrides: { doSave?: () => void } = {}) {
  const seams = makeSeams();
  const doSave = vi.fn(overrides.doSave);
  const buildSerialized = vi.fn(() => serialized);
  const view = renderHook(() =>
    useAutosave({
      onFactoryMutate: seams.onFactoryMutate,
      onSessionSwap: seams.onSessionSwap,
      buildSerialized,
      doSave,
    }),
  );
  return { ...view, seams, doSave, buildSerialized };
}

beforeEach(() => {
  installLocalStorageMock();
  localStorage.setItem("sfp:consent", "true");
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutosave", () => {
  it("R1.S1 — burst of mutations coalesces into one write 400ms after the last", () => {
    const { seams, doSave } = mount();
    act(() => {
      seams.emitMutate();
      vi.advanceTimersByTime(100);
      seams.emitMutate();
      vi.advanceTimersByTime(100);
      seams.emitMutate();
    });
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(doSave).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(doSave).toHaveBeenCalledTimes(1);
  });

  it("R1.S2 — expiry writes autosave slot when disabled, saves library when enabled", () => {
    const { result, seams, doSave } = mount();
    act(() => result.current.setAutosaveEnabled(false));
    act(() => {
      seams.emitMutate();
      vi.advanceTimersByTime(400);
    });
    expect(doSave).not.toHaveBeenCalled();
    expect(localStorage.getItem("sfp:autosave")).toBeTruthy();

    localStorage.removeItem("sfp:autosave");
    act(() => result.current.setAutosaveEnabled(true));
    act(() => {
      seams.emitMutate();
      vi.advanceTimersByTime(400);
    });
    expect(doSave).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("sfp:autosave")).toBeNull();
  });

  it("R2.S1 — no consent: no timer, no write", () => {
    localStorage.removeItem("sfp:consent");
    const { seams, doSave } = mount();
    act(() => {
      seams.emitMutate();
      vi.advanceTimersByTime(1000);
    });
    expect(doSave).not.toHaveBeenCalled();
    expect(localStorage.getItem("sfp:autosave")).toBeNull();
  });

  it("R3.S1 — flush with pending timer and autosave enabled saves to library", () => {
    const { result, seams, doSave } = mount();
    act(() => {
      seams.emitMutate();
    });
    act(() => result.current.flush());
    expect(doSave).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(doSave).toHaveBeenCalledTimes(1);
  });

  it("R3.S2 — flush with autosave disabled writes the autosave slot only", () => {
    const { result, seams, doSave } = mount();
    act(() => result.current.setAutosaveEnabled(false));
    act(() => {
      seams.emitMutate();
    });
    act(() => result.current.flush());
    expect(doSave).not.toHaveBeenCalled();
    expect(localStorage.getItem("sfp:autosave")).toBeTruthy();
  });

  it("R3.S3 — flush without pending timer writes nothing", () => {
    const { result, doSave } = mount();
    act(() => result.current.flush());
    expect(doSave).not.toHaveBeenCalled();
    expect(localStorage.getItem("sfp:autosave")).toBeNull();
  });

  it("R4.S1 — unmount flushes a pending write exactly once", () => {
    const { seams, doSave, unmount } = mount();
    act(() => {
      seams.emitMutate();
      vi.advanceTimersByTime(100);
    });
    unmount();
    expect(doSave).toHaveBeenCalledTimes(1);
  });

  it("R4.S2 — beforeunload flushes a pending write", () => {
    const { seams, doSave } = mount();
    act(() => {
      seams.emitMutate();
      vi.advanceTimersByTime(100);
    });
    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });
    expect(doSave).toHaveBeenCalledTimes(1);
  });

  it("R5.S1 — cancelPending stops a pending timer so explicit save happens once", () => {
    const { result, seams, doSave } = mount();
    act(() => {
      seams.emitMutate();
    });
    act(() => result.current.cancelPending());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(doSave).not.toHaveBeenCalled();
  });

  it("R6.S1 — enableAutosave persists the preference", () => {
    const { result } = mount();
    act(() => result.current.setAutosaveEnabled(false));
    act(() => result.current.enableAutosave());
    expect(result.current.autosaveEnabled).toBe(true);
    expect(localStorage.getItem("sfp:autosave-pref")).toBe("true");
  });

  it("R7.S1 — session swap cancels a stale pending timer", () => {
    const { seams, doSave } = mount();
    act(() => {
      seams.emitMutate();
      vi.advanceTimersByTime(100);
    });
    act(() => {
      seams.emitSwap();
      vi.advanceTimersByTime(1000);
    });
    expect(doSave).not.toHaveBeenCalled();
    expect(localStorage.getItem("sfp:autosave")).toBeNull();
  });
});
