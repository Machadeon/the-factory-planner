import MuiListItemIcon from "@mui/material/ListItemIcon";
import MuiListItemText from "@mui/material/ListItemText";
import MuiMenu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import type { ReactNode } from "react";

interface MenuItemDef {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export interface MenuProps {
  anchorEl: Element | null | undefined;
  open: boolean;
  onClose: () => void;
  items: MenuItemDef[];
}

// Thin wrap-and-hide for MUI Menu+MenuItem+ListItemIcon+ListItemText
// (allowlisted popover/listbox widget, ADR-0001) — flat items-array API
// instead of composing MenuItem/ListItemIcon at each call site.
export default function Menu({ anchorEl, open, onClose, items }: MenuProps) {
  return (
    <MuiMenu anchorEl={anchorEl} open={open} onClose={onClose}>
      {items.map((item) => (
        <MuiMenuItem
          key={item.key}
          onClick={item.onClick}
          className={item.danger ? "text-red-500!" : undefined}
        >
          <MuiListItemIcon
            className={item.danger ? "text-inherit!" : undefined}
          >
            {item.icon}
          </MuiListItemIcon>
          <MuiListItemText>{item.label}</MuiListItemText>
        </MuiMenuItem>
      ))}
    </MuiMenu>
  );
}
