import MuiSlider, {
  type SliderProps as MuiSliderProps,
} from "@mui/material/Slider";

export interface SliderProps extends Omit<MuiSliderProps, "sx" | "color"> {
  /** Track/thumb/active-mark accent color — the `sx` composition stays
   * inside this wrapper (ADR-0001: sx is authored only inside ui/). */
  accentColor?: string;
  thumbColor?: string;
}

// Thin wrap-and-hide for MUI Slider (allowlisted, ADR-0001) — keeps the
// `.MuiSlider-*` `sx` overrides isolated in ui/ instead of leaking into
// planning/; callers pass a plain color string instead of composing sx.
export default function Slider({
  accentColor,
  thumbColor,
  ...props
}: SliderProps) {
  return (
    <MuiSlider
      {...props}
      sx={
        accentColor
          ? {
              flex: 1,
              "& .MuiSlider-track": {
                backgroundColor: accentColor,
                borderColor: accentColor,
              },
              "& .MuiSlider-thumb": {
                backgroundColor: thumbColor ?? accentColor,
              },
              "& .MuiSlider-markActive": { backgroundColor: accentColor },
            }
          : { flex: 1 }
      }
    />
  );
}
