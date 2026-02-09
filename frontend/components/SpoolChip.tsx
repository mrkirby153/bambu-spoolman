import { Spool } from "@/lib/proto/bambu_spoolman/grpc/spoolman";
import { MultiColorDirection } from "@/lib/types";
import { cva, type VariantProps } from "class-variance-authority";

const spoolChip = cva(["border", "border-2"], {
  variants: {
    size: {
      large: ["w-15", "h-15"],
      small: ["w-7.5", "h-7.5"],
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
  withPercentage?: boolean;
}

function getBackgroundColor(spool: Spool) {
  const filament = spool.filament;
  if (!filament) {
    return "bg-gray-500";
  }
  if (filament.colorHex) {
    return "#" + filament.colorHex;
  }
  if (filament.multiColorDirection && filament.multiColorHexes) {
    if (filament.multiColorDirection === MultiColorDirection.LONGITUDINAL) {
      const hexes = filament.multiColorHexes
        .split(",")
        .map((hex) => "#" + hex)
        .join(", ");
      return "linear-gradient(90deg, " + hexes + ")";
    }
    if (filament.multiColorDirection === MultiColorDirection.COAXIAL) {
      const hexes = filament.multiColorHexes.split(",").map((hex) => "#" + hex);

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

export function SpoolChip(props: SpoolChipProps) {
  let percentage = 100;
  if (
    props.spool &&
    props.withPercentage &&
    props.spool.remainingLength &&
    props.spool.usedLength
  ) {
    const remainingLength = props.spool.remainingLength;
    const usedLength = props.spool.usedLength;
    percentage = (remainingLength / (remainingLength + usedLength)) * 100;
  }
  return (
    <div className="flex flex-col items-center">
      <div className={spoolChip({ size: props.size, active: false })}>
        <div
          className="h-full"
          style={{
            clipPath: `inset(${100 - percentage}% 0 0 0)`,
            background: props.spool
              ? getBackgroundColor(props.spool)
              : undefined,
          }}
        ></div>
      </div>
    </div>
  );
}
