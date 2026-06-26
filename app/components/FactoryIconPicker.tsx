"use client";

import ImageIcon from "@mui/icons-material/Image";
import { Popover, TextField, Tooltip } from "@mui/material";
import { useRef, useState } from "react";
import { parts } from "../models/library";
import Clickable from "./Clickable";
import Icon from "./Icon";

interface Props {
  icon?: string;
  onChange: (icon: string | undefined) => void;
}

export default function FactoryIconPicker({ icon, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);

  const filtered = parts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function close() {
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      <Tooltip title="Set factory icon">
        <div ref={anchorRef}>
          <Clickable className="p-1" onClick={() => setOpen(true)}>
            {icon ? (
              <Icon src={icon} label="Factory icon" size={36} />
            ) : (
              <ImageIcon sx={{ fontSize: "2.25rem", opacity: 0.4 }} />
            )}
          </Clickable>
        </div>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <div className="p-2 flex flex-col gap-2" style={{ width: "20rem" }}>
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
          <div
            className="grid overflow-y-auto"
            style={{
              gridTemplateColumns: "repeat(8, 1fr)",
              maxHeight: "16rem",
            }}
          >
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
      </Popover>
    </>
  );
}
