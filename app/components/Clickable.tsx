import type { MouseEventHandler } from "react";

export const defaultClass = "cursor-pointer rounded-sm";

export const defaultHoverClass =
  " hover:bg-[rgba(128,128,128,0.3)] active:bg-[rgba(128,128,128,0.2)]";

export const warningClass =
  " m-[-2] border-2 border-[rgba(255,128,0,0.75)] hover:bg-[rgba(128,64,0,0.3)] active:bg-[rgba(128,64,0,0.2)]";

export const dangerClass =
  " m-[-2] border-2 border-[rgba(255,0,0,0.75)] hover:bg-[rgba(128,0,0,0.3)] active:bg-[rgba(128,0,0,0.2)]";

export type ClickableStyle = "danger" | "warning" | "default";

export interface ClickableProps {
  children: React.ReactNode;
  onClick: MouseEventHandler<HTMLDivElement>;
  className?: string;
  style?: ClickableStyle;
}

export default function Clickable({
  children,
  onClick,
  className,
  style,
}: ClickableProps) {
  var finalClassName = defaultClass;
  if (style === "danger") {
    finalClassName += dangerClass;
  } else if (style === "warning") {
    finalClassName += warningClass;
  } else {
    finalClassName += defaultHoverClass;
  }

  if (className) {
    finalClassName += ` ${className}`;
  }

  return (
    <div className={finalClassName} onClick={onClick}>
      {children}
    </div>
  );
}
