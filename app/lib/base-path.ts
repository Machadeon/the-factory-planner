// Prefixes root-relative asset paths for plain <img> elements, which — unlike
// next/image — do not get basePath applied by Next. Env read stays inline so
// tests can stub both modes.
export function withBasePath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
