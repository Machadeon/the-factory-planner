import { Tooltip } from "@mui/material";
import { withBasePath } from "@/app/lib/base-path";

interface IconProps {
  src: string;
  /**
   * Used for `alt` and the native hover tooltip (`title`). Pass "" for purely
   * decorative icons — no tooltip is rendered and the image is hidden from a11y.
   */
  label?: string;
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
export default function Icon({ src, label, size, className }: IconProps) {
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
      alt={label}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
