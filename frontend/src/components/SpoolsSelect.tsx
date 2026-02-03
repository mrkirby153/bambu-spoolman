import useSpoolsQuery from "@app/hooks/Spools";
import { Spool } from "@app/types";


import classNames from "classnames";
import { SelectHTMLAttributes } from "react";
import { cva } from "class-variance-authority";

const input = cva(["border", "rounded", "p1"], {
  variants: {
    disabled: {
      true: ["cursor-not-allowed", "bg-gray-100", "border-gray-200"],
      false: ["border-gray-300"],
    },
  },
});

export default function SpoolsSelect({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const { data } = useSpoolsQuery();
  
  return (
    <select
      {...props}
      className={classNames(
        input({ disabled: props.disabled }),
        className,
      )}
    >
    {data.map((item: Spool) =>
        <option key={item.id} value={item.id}>{item.id}: {item.filament.name} - {item.filament.vendor.name}</option>
    )}
    </select>
  );
}

