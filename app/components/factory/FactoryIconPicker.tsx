"use client";

import ImageIcon from "@mui/icons-material/Image";
import { useRef, useState } from "react";
import { parts } from "../../models/game-data";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import TextField from "../ui/TextField";

interface Props {
  icon?: string;
  onChange: (icon: string | undefined) => void;
}

export default function FactoryIconPicker({ icon, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = parts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function close() {
    setOpen(false);
    setSearch("");
  }

  // Same outside-interaction close as AddItemControl: relatedTarget covers
  // Tab/click-to-elsewhere; the rAF recheck covers clicks on non-focusable
  // content inside the panel and window blur.
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget;
    if (next) {
      if (!wrapperRef.current?.contains(next)) close();
      return;
    }
    requestAnimationFrame(() => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(document.activeElement)) return;
      close();
    });
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: onBlur is focus containment for the revealed panel, not an interactive handler
    <div ref={wrapperRef} onBlur={handleBlur} className="relative">
      <IconButton
        aria-label="Set factory icon"
        className="p-1"
        onClick={() => setOpen(true)}
      >
        {icon ? (
          <Icon src={icon} label="Factory icon" size={36} />
        ) : (
          <ImageIcon className="text-[2.25rem]! opacity-40" />
        )}
      </IconButton>
      {open && (
        <div className="absolute top-full left-0 z-10 mt-1 p-2 flex flex-col gap-2 w-80 rounded-sm border border-[rgba(128,128,128,0.4)] bg-zinc-900 shadow-lg">
          <TextField
            size="small"
            fullWidth
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {icon && (
            <button
              type="button"
              className="text-sm text-left text-gray-400 hover:text-white px-1"
              onClick={() => {
                onChange(undefined);
                close();
              }}
            >
              Clear icon
            </button>
          )}
          <div className="grid grid-cols-8 overflow-y-auto max-h-64">
            {filtered.map((part) => (
              <button
                key={part.slug}
                type="button"
                className="p-1 rounded hover:bg-white/10"
                onClick={() => {
                  onChange(part.iconLarge);
                  close();
                }}
              >
                <Icon src={part.iconSmall} label={part.name} size={32} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
