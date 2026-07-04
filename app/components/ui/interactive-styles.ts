// Shared class strings for the interactive primitives (IconButton, ActionRow).
// The visual classes are carried over verbatim from the retired Clickable so
// the div→button swap is visually inert; the reset neutralizes UA button
// styling and the focus ring is explicit because UA defaults are low-contrast
// on the app's dark surfaces.

export const interactiveBaseClass = "cursor-pointer rounded-sm";

export const interactiveHoverClass =
  " hover:bg-[rgba(128,128,128,0.3)] active:bg-[rgba(128,128,128,0.2)]";

export const interactiveWarningClass =
  " m-[-2] border-2 border-[rgba(255,128,0,0.75)] hover:bg-[rgba(128,64,0,0.3)] active:bg-[rgba(128,64,0,0.2)]";

export const interactiveDangerClass =
  " m-[-2] border-2 border-[rgba(255,0,0,0.75)] hover:bg-[rgba(128,0,0,0.3)] active:bg-[rgba(128,0,0,0.2)]";

// No m-0/font utilities: Tailwind preflight already inherits font and zeroes
// margins, and utility-order conflicts with the variants' m-[-2] would be
// unpredictable. p-0/border-0 sort before call-site p-1 and variant border-2,
// so overrides win.
export const buttonResetClass = " bg-transparent border-0 p-0 text-left";

export const focusVisibleClass =
  " focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500";

export type InteractiveVariant = "default" | "warning" | "danger";

export function interactiveClasses(
  variant: InteractiveVariant = "default",
  className?: string,
): string {
  let result = interactiveBaseClass;
  if (variant === "danger") {
    result += interactiveDangerClass;
  } else if (variant === "warning") {
    result += interactiveWarningClass;
  } else {
    result += interactiveHoverClass;
  }
  result += buttonResetClass + focusVisibleClass;
  if (className) {
    result += ` ${className}`;
  }
  return result;
}
