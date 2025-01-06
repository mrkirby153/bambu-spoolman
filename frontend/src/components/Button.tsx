import classNames from "classnames";
import type { ButtonHTMLAttributes } from "react";

export type Variant = "primary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  let colors = "";
  switch (variant) {
    case "primary":
      colors = "bg-blue-500 hover:bg-blue-700 disabled:bg-blue-200";
      break;
    case "danger":
      colors = "bg-red-500 hover:bg-red-700 disabled:bg-red-200";
      break;
  }

  return (
    <button
      {...props}
      className={classNames(
        "text-white font-bold py-2 px-4 rounded",
        colors,
        className,
      )}
    />
  );
}
