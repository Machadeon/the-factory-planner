import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import useDragResize from "@/app/hooks/useDragResize";

beforeEach(() => {
  localStorage.clear();
});

function drag(
  result: { current: ReturnType<typeof useDragResize> },
  fromX: number,
  toX: number,
) {
  act(() => {
    result.current.handleResizeDividerMouseDown({
      preventDefault: () => {},
      clientX: fromX,
    } as unknown as React.MouseEvent);
  });
  act(() => {
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: toX }));
  });
  act(() => {
    document.dispatchEvent(new MouseEvent("mouseup"));
  });
}

describe("useDragResize (page-structure R4)", () => {
  it("reads initial width from storage on mount", () => {
    localStorage.setItem("sfp:sidebar-width", "451");
    const { result } = renderHook(() => useDragResize());
    expect(result.current.sidebarWidth).toBe(451);
  });

  it("R4.S1 — clamps to 700 and persists exactly once on mouseup", () => {
    const { result } = renderHook(() => useDragResize());
    // dragging left grows the sidebar: delta = startX - clientX
    drag(result, 1000, 0);
    expect(result.current.sidebarWidth).toBe(700);
    expect(localStorage.getItem("sfp:sidebar-width")).toBe("700");
  });

  it("clamps to 200 minimum", () => {
    const { result } = renderHook(() => useDragResize());
    drag(result, 0, 1000);
    expect(result.current.sidebarWidth).toBe(200);
  });
});
