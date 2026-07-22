"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// No CssBaseline: Tailwind preflight is the single reset source of truth
// (ADR-0001) — running both reset layers was a redundant specificity risk.
export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)", {
    defaultMatches: true,
  });

  const theme = createTheme({
    palette: {
      mode: prefersDarkMode ? "dark" : "light",
    },
  });

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
