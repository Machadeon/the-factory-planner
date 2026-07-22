import { Component, type ReactNode } from "react";
import { downloadJson } from "@/app/lib/download";
import { loadLibrary } from "@/app/models/storage-service";
import Button from "./Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// React requires a class component for error boundaries — no hook
// equivalent exists. Fallback is a static recovery screen, not a toast:
// a crash means render itself failed, so it needs a surface that doesn't
// depend on the broken tree.
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled render error caught by ErrorBoundary:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  handleExport = () => {
    const library = loadLibrary();
    downloadJson(library, "satisfactory-factories-recovery.json");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-xl font-semibold">Something went wrong.</p>
        <p className="text-sm text-gray-400 max-w-md">
          The app hit an unexpected error and couldn't continue. Your saved
          factories are still in this browser's storage — export a backup before
          trying again.
        </p>
        <div className="flex flex-row gap-3">
          <Button variant="outlined" onClick={this.handleExport}>
            Export your data
          </Button>
          <Button variant="contained" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
}
