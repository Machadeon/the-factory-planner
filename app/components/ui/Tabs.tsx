import { type KeyboardEvent, useRef } from "react";

interface TabDef {
  value: string;
  label: string;
}

export interface TabsProps {
  tabs: TabDef[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Hand-rolled per the WAI-ARIA APG "Tabs (automatic activation)" pattern —
// small fixed set, safe to hand-roll rather than pull in a whole MUI Tabs
// for 3 static entries. Roving tabindex: only the selected tab is in the
// Tab order; arrow keys move focus and activate immediately.
export default function Tabs({ tabs, value, onChange, className }: TabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function activate(next: string) {
    onChange(next);
    tabRefs.current.get(next)?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((t) => t.value === value);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      activate(tabs[(index + 1) % tabs.length].value);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      activate(tabs[(index - 1 + tabs.length) % tabs.length].value);
    } else if (e.key === "Home") {
      e.preventDefault();
      activate(tabs[0].value);
    } else if (e.key === "End") {
      e.preventDefault();
      activate(tabs[tabs.length - 1].value);
    }
  }

  return (
    <div
      role="tablist"
      className={`flex flex-row border-b border-gray-700 ${className ?? ""}`}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.value, el);
              else tabRefs.current.delete(tab.value);
            }}
            type="button"
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => activate(tab.value)}
            onKeyDown={onKeyDown}
            className={
              "px-4 py-2 text-sm font-medium cursor-pointer border-b-2 -mb-px " +
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 " +
              (selected
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-gray-400 hover:text-gray-200")
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
