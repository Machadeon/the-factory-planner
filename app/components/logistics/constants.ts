// Pixels per in-game meter for sizing assembly-line node bodies to real footprint.
// Kept small so large machine banks stay navigable; footprint stays proportional.
export const SCALE = 2;

// Floor of a node body so ports and labels stay legible for tiny banks. Width floor fits
// the longest recipe name ("Silicon High-Speed Connector") at the header type size.
export const MIN_BODY_W = 248;
export const MIN_BODY_H = 64;

// Grid the nodes snap to while dragging.
export const GRID = 16;
