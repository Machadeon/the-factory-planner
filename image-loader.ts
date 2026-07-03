// Custom next/image loader for static export. Prepends the build-time base path
// to root-relative sources. Required because `images.unoptimized` emits the raw
// `src` and does NOT apply `basePath` — only a custom loader does. Env is read
// inline so it is inlined into the client bundle (NEXT_PUBLIC_ prefix) and stubs
// cleanly in tests.
export default function imageLoader({ src }: { src: string }): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return src.startsWith("/") ? `${basePath}${src}` : src;
}
