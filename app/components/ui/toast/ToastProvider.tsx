"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from "react";
import ToastRegion from "./ToastRegion";

export const TOAST_AUTO_DISMISS_MS = 5000;
export const TOAST_MAX_VISIBLE = 3;

export type ToastVariant = "error" | "success" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ToastInput {
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

type Action = { type: "add"; toast: Toast } | { type: "remove"; id: number };

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case "add":
      return [...state, action.toast];
    case "remove":
      return state.filter((t) => t.id !== action.id);
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);
  const nextId = useRef(0);

  const show = useCallback((input: ToastInput) => {
    dispatch({ type: "add", toast: { id: nextId.current++, ...input } });
  }, []);

  const dismiss = useCallback((id: number) => {
    dispatch({ type: "remove", id });
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
