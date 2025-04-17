import type { Spool } from "@app/types";
import { MultiColorDirection } from "@app/types";
import { cva, type VariantProps } from "class-variance-authority";

const spoolChip = cva(["border", "border-2"], {
  variants: {
    size: {
      large: ["w-[60px]", "h-[60px]"],
      small: ["w-[30px]", "h-[30px]"],
    },
    active: {
      true: ["border-yellow-500"],
      false: ["border-black"],
    },
  },
  defaultVariants: {
    active: false,
  },
});

interface SpoolChipProps extends VariantProps<typeof spoolChip> {
  spool: Spool | null;
  showUsage?: boolean;
  showMaterial?: boolean;
}

function getBackgroundColor(spool: Spool) {
  if (spool.filament.color_hex) {
    return "#" + spool.filament.color_hex;
  }
  if (
    spool.filament.multi_color_direction &&
    spool.filament.multi_color_hexes
  ) {
    if (
      spool.filament.multi_color_direction === MultiColorDirection.LONGITUDINAL
    ) {
      const hexes = spool.filament.multi_color_hexes
        .split(",")
        .map((hex) => "#" + hex)
        .join(", ");
      return "linear-gradient(90deg, " + hexes + ")";
    }
    if (spool.filament.multi_color_direction === MultiColorDirection.COAXIAL) {
      const hexes = spool.filament.multi_color_hexes
        .split(",")
        .map((hex) => "#" + hex);

      const percentages = 100.0 / hexes.length;
      const stops = hexes
        .map((hex, i) => {
          return `${hex} ${i * percentages}%, ${hex} ${(i + 1) * percentages}%`;
        })
        .join(", ");
      return "linear-gradient(90deg, " + stops + ")";
    }
  }
}

export default function AmsSpoolChip({
  spool,
  active,
  size = "large",
  showUsage,
  showMaterial,
}: SpoolChipProps) {
  const materialName = spool?.filament.material || "?";

  let percentage = 100;
  if (spool && spool.remaining_length && spool.used_length && showUsage) {
    const remainingLength = spool.remaining_length || 1;
    const usedLength = spool.used_length || 1;
    percentage = (remainingLength / (remainingLength + usedLength)) * 100;
  }

  return (
    <div className="flex flex-col items-center">
      <div className={spoolChip({ size, active })}>
        <div
          className="h-full"
          style={{
            clipPath: `inset(${100 - percentage}% 0 0 0)`,
            background: spool ? getBackgroundColor(spool) : undefined,
          }}
        />
      </div>
      {showMaterial && <span>{materialName}</span>}
    </div>
  );
}
