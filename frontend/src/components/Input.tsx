import classNames from "classnames";
import { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";
import { cva } from "class-variance-authority";

const input = cva(["border", "rounded", "p1"], {
  variants: {
    disabled: {
      true: ["cursor-not-allowed", "bg-gray-100", "border-gray-200"],
      false: ["border-gray-300"],
    },
  },
});

export default function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={classNames(
        input({ disabled: props.disabled }),
        className,
        styles.textField,
      )}
    />
  );
}
