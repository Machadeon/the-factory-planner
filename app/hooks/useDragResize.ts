"use client";

import { useEffect, useRef, useState } from "react";
import {
  getSidebarWidth,
  setSidebarWidth as persistSidebarWidth,
} from "../models/storage-service";

const MIN_WIDTH = 200;
const MAX_WIDTH = 700;

// Sidebar divider drag: live width updates during drag, clamped to
// [MIN_WIDTH, MAX_WIDTH], persisted once on mouseup.
export default function useDragResize() {
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const sidebarWidthRef = useRef(380);
  sidebarWidthRef.current = sidebarWidth;
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );

  useEffect(() => {
    const stored = getSidebarWidth();
    setSidebarWidth(stored);
    sidebarWidthRef.current = stored;
  }, []);

  function handleResizeDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragStateRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragStateRef.current) return;
      const delta = dragStateRef.current.startX - ev.clientX;
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, dragStateRef.current.startWidth + delta),
      );
      setSidebarWidth(newWidth);
      sidebarWidthRef.current = newWidth;
    };
    const onMouseUp = () => {
      persistSidebarWidth(sidebarWidthRef.current);
      dragStateRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  return { sidebarWidth, handleResizeDividerMouseDown };
}
