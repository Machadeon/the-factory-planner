// Pixels per in-game meter for sizing assembly-line node bodies to real footprint.
// Kept small so large machine banks stay navigable; footprint stays proportional.
export const SCALE = 2;

// Floor of a node body so ports and labels stay legible for tiny banks.
export const MIN_BODY_W = 96;
export const MIN_BODY_H = 64;

// Grid the nodes snap to while dragging.
export const GRID = 16;
