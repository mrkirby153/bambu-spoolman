import classNames from "classnames";
import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const button = cva(
  [
    "text-white",
    "font-bold",
    "py-2",
    "px-4",
    "rounded",
    "disabled:cursor-not-allowed",
  ],
  {
    variants: {
      intent: {
        neutral: ["bg-gray-500", "hover:bg-gray-700", "disabled:bg-gray-200"],
        primary: ["bg-blue-500", "hover:bg-blue-700", "disabled:bg-blue-200"],
        danger: ["bg-red-500", "hover:bg-red-700", "disabled:bg-red-200"],
      },
    },
  },
);
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export type Variant = VariantProps<typeof button>;

export default function Button({
  intent = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button {...props} className={classNames(button({ intent }), className)} />
  );
}
