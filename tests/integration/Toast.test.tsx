import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TOAST_AUTO_DISMISS_MS,
  TOAST_MAX_QUEUE,
  ToastProvider,
  useToast,
} from "@/app/components/ui/toast/ToastProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function toasts() {
  return screen.queryAllByTestId("toast");
}

describe("toast-notifications", () => {
  it("R1.S1 — show renders the message and returns synchronously", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    let returned: unknown = "sentinel";
    act(() => {
      returned = result.current.show({ message: "hello", variant: "info" });
    });
    expect(returned).toBeUndefined();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("R1.S2 — useToast outside a provider throws", () => {
    // Silence the expected React error boundary console noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it("R5.S1 — primitive imports no @mui widget", () => {
    const dir = join(process.cwd(), "app/components/ui/toast");
    for (const file of [
      "ToastProvider.tsx",
      "ToastRegion.tsx",
      "ToastItem.tsx",
    ]) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src).not.toMatch(/@mui\//);
    }
  });

  it("R4.S2 — variant distinguishable by aria-hidden icon, not color alone", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.show({ message: "boom", variant: "error" }));
    const toast = screen.getByTestId("toast");
    const icon = within(toast).getByTestId("toast-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon.textContent?.trim().length).toBeGreaterThan(0);
  });

  it("R4.S1 — error message node is role=alert; close button is a sibling", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.show({ message: "boom", variant: "error" }));
    const msg = screen.getByTestId("toast-message");
    expect(msg).toHaveAttribute("role", "alert");
    expect(within(msg).queryByTestId("toast-close")).toBeNull();
  });

  it("R4.S3 — info message node is role=status / aria-live=polite", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.show({ message: "fyi", variant: "info" }));
    const msg = screen.getByTestId("toast-message");
    expect(msg).toHaveAttribute("role", "status");
    expect(msg).toHaveAttribute("aria-live", "polite");
  });

  it("R4.S4 — close control has an accessible name", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.show({ message: "x", variant: "info" }));
    expect(
      screen.getByRole("button", { name: "Dismiss notification" }),
    ).toBeInTheDocument();
  });

  describe("with fake timers", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("R2.S1 — error is sticky past the auto-dismiss window", () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      act(() => result.current.show({ message: "boom", variant: "error" }));
      act(() => vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS * 3));
      expect(toasts()).toHaveLength(1);
    });

    it("R2.S2 — info auto-dismisses after the timeout", () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      act(() => result.current.show({ message: "fyi", variant: "info" }));
      expect(toasts()).toHaveLength(1);
      act(() => vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS));
      expect(toasts()).toHaveLength(0);
    });

    it("R3.S1 — three toasts stack; none removed by a later one", () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      act(() => {
        result.current.show({ message: "a", variant: "error" });
        result.current.show({ message: "b", variant: "error" });
        result.current.show({ message: "c", variant: "error" });
      });
      expect(toasts()).toHaveLength(3);
      expect(screen.getByText("a")).toBeInTheDocument();
    });

    it("R3.S2 — 4th/5th queue; dismissing surfaces 4th (older) before 5th", () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      act(() => {
        for (const m of ["a", "b", "c", "d", "e"]) {
          result.current.show({ message: m, variant: "error" });
        }
      });
      expect(toasts()).toHaveLength(3);
      expect(screen.queryByText("d")).toBeNull();
      // dismiss the first visible (a) -> d appears, e still queued
      const firstClose = screen.getAllByTestId("toast-close")[0];
      act(() => firstClose.click());
      expect(screen.getByText("d")).toBeInTheDocument();
      expect(screen.queryByText("e")).toBeNull();
    });

    it("R3.S3 — three sticky errors block an info until one is closed", () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      act(() => {
        result.current.show({ message: "e1", variant: "error" });
        result.current.show({ message: "e2", variant: "error" });
        result.current.show({ message: "e3", variant: "error" });
        result.current.show({ message: "later", variant: "info" });
      });
      expect(screen.queryByText("later")).toBeNull();
      const firstClose = screen.getAllByTestId("toast-close")[0];
      act(() => firstClose.click());
      expect(screen.getByText("later")).toBeInTheDocument();
    });
  });

  it("D-C3.5 — showing more than TOAST_MAX_QUEUE drops the oldest queued entry, keeping the array capped", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    const total = TOAST_MAX_QUEUE + 5;
    act(() => {
      for (let i = 0; i < total; i++) {
        result.current.show({ message: `m${i}`, variant: "error" });
      }
    });
    // Drain every visible+queued toast by repeatedly closing the first
    // visible one, collecting every message that ever appeared.
    const seen: string[] = [];
    for (let i = 0; i < total; i++) {
      const closes = screen.queryAllByTestId("toast-close");
      if (closes.length === 0) break;
      const visibleTexts = screen
        .queryAllByTestId("toast-message")
        .map((el) => el.textContent ?? "");
      for (const t of visibleTexts) if (!seen.includes(t)) seen.push(t);
      act(() => closes[0].click());
    }
    // Only the newest TOAST_MAX_QUEUE entries ever surfaced — the oldest 5
    // (m0..m4) were dropped from the queue before ever becoming visible.
    expect(seen).toHaveLength(TOAST_MAX_QUEUE);
    expect(seen.some((t) => t.includes("m0"))).toBe(false);
    expect(seen.some((t) => t.includes("m4"))).toBe(false);
    expect(seen.some((t) => t.includes(`m${total - 1}`))).toBe(true);
  });

  it("R2.S3 — manual close removes the toast immediately", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.show({ message: "x", variant: "error" }));
    await user.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(toasts()).toHaveLength(0);
  });
});
