import classNames from "classnames";
import { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

export default function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={classNames(
        "border border-gray-300 rounded p-1",
        className,
        styles.textField
      )}
    />
  );
}
