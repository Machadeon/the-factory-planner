"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
