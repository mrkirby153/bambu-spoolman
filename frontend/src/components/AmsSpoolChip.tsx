import classNames from "classnames";
import type { Spool } from "@app/types";
import { MultiColorDirection } from "@app/types";

export enum SpoolChipSize {
  SMALL,
  LARGE,
}

type SpoolChipProps = {
  spool: Spool | null;
  size?: SpoolChipSize;
  borderStyle?: string;
  showUsage?: boolean;
  showMaterial?: boolean;
};

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
  borderStyle,
  size,
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

  let sizeClass = "w-[60px] h-[60px]";
  switch (size) {
    case SpoolChipSize.SMALL:
      sizeClass = "w-[30px] h-[30px]";
      break;
    default:
      break;
  }

  return (
    <div className="flex flex-col items-center">
      <div className={borderStyle || "border-black border-2"}>
        <div
          className={classNames(sizeClass)}
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
