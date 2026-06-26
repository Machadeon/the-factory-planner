import type { MouseEventHandler } from "react";

export const defaultClass =
  "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm active:bg-zinc-200 dark:active:bg-zinc-700";

export default function Clickable({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: MouseEventHandler<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div className={`${defaultClass} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
