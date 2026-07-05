import { Tooltip } from "@mui/material";
import { withBasePath } from "@/app/lib/base-path";

interface IconProps {
  src: string;
  /**
   * Used for `alt` and the MUI hover tooltip. Pass "" for purely decorative
   * icons — no tooltip, empty alt, hidden from a11y. For an accessible name
   * WITHOUT a tooltip, use `alt` instead.
   */
  label?: string;
  /**
   * Accessible name without a tooltip — for informative icons whose former
   * next/image rendering had alt text but no hover tooltip. Ignored when a
   * non-empty `label` is set.
   */
  alt?: string;
  size: number;
  className?: string;
}

/**
 * Lightweight icon for the many small static game images.
 *
 * Deliberately a plain `<img>` rather than `next/image`: at 20–64px these icons
 * gain nothing from srcset/lazy-observer/optimization and the per-instance
 * overhead is significant when hundreds render at once (e.g. RecipeListDialog).
 */
export default function Icon({ src, label, alt, size, className }: IconProps) {
  return label ? (
    <Tooltip title={label}>
      {/* biome-ignore lint/performance/noImgElement: next/image overhead is wasted on these tiny static icons rendered hundreds at a time */}
      <img
        src={withBasePath(src)}
        alt={label}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={className}
      />
    </Tooltip>
  ) : (
    // biome-ignore lint/performance/noImgElement: next/image overhead is wasted on these tiny static icons rendered hundreds at a time
    <img
      src={withBasePath(src)}
      alt={label ?? alt ?? ""}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
