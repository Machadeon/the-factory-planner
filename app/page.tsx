"use client";

import FactoryPage from "./components/factory/FactoryPage";
import { withBasePath } from "./lib/base-path";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex min-h-screen w-full max-w-full flex-col items-center py-8 px-4 bg-white dark:bg-zinc-900 sm:items-start gap-4">
        <div className="flex-row">
          {/* biome-ignore lint/performance/noImgElement: next/image is banned (static export, no loader); LCP handled via fetchPriority */}
          <img
            className="inline"
            src={withBasePath("/satisfactory_logo_full_color_small.png")}
            alt="Satisfactory logo"
            width={300}
            height={20}
            fetchPriority="high"
            decoding="async"
          />
          <span className="font-semibold text-6xl align-bottom pl-2 text-amber-500">
            Planner
          </span>
        </div>
        <FactoryPage />
      </main>
    </div>
  );
}
