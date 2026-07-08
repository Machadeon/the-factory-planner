import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useConsentGate from "@/app/hooks/useConsentGate";
import { installLocalStorageMock } from "../../helpers/local-storage-mock";

function grant() {
  localStorage.setItem("sfp:consent", "true");
}

beforeEach(() => {
  installLocalStorageMock();
});

describe("useConsentGate", () => {
  it("R1.S1 — executes synchronously when consent exists", () => {
    grant();
    const onConsentGranted = vi.fn();
    const { result } = renderHook(() => useConsentGate({ onConsentGranted }));
    const action = vi.fn();
    act(() => result.current.requireConsent(action));
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.consentOpen).toBe(false);
  });

  it("R1.S2 — defers and opens dialog without consent", () => {
    const { result } = renderHook(() => useConsentGate({}));
    const action = vi.fn();
    act(() => result.current.requireConsent(action));
    expect(action).not.toHaveBeenCalled();
    expect(result.current.consentOpen).toBe(true);
  });

  it("R1.S3 — re-entrant requireConsent replaces the pending action", () => {
    const { result } = renderHook(() => useConsentGate({}));
    const a = vi.fn();
    const b = vi.fn();
    act(() => result.current.requireConsent(a));
    act(() => result.current.requireConsent(b));
    act(() => result.current.handleAllow());
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("R2.S1 — allow signals consent granted then replays exactly once", () => {
    const calls: string[] = [];
    const onConsentGranted = vi.fn(() => calls.push("granted"));
    const { result } = renderHook(() => useConsentGate({ onConsentGranted }));
    const action = vi.fn(() => calls.push("action"));
    act(() => result.current.requireConsent(action));
    act(() => result.current.handleAllow());
    expect(calls).toEqual(["granted", "action"]);
    expect(result.current.consentOpen).toBe(false);
    act(() => result.current.handleAllow());
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("R3.S1 — cancel discards the pending action", () => {
    const { result } = renderHook(() => useConsentGate({}));
    const action = vi.fn();
    act(() => result.current.requireConsent(action));
    act(() => result.current.handleCancel());
    expect(action).not.toHaveBeenCalled();
    expect(result.current.consentOpen).toBe(false);
    act(() => result.current.handleAllow());
    expect(action).not.toHaveBeenCalled();
  });
});
