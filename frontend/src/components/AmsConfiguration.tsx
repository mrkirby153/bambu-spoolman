import { MultiColorDirection, Spool } from "@app/types";
import { useQuery } from "@tanstack/react-query";
import styles from "./AmsConfiguration.module.css";
import classNames from "classnames";
import useSettings from "@app/hooks/useSettings";

export type AmsConfigurationProps = {
  id: number;
};

type AmsSlotProps = {
  spoolId: number;
  amsId: number;
  slotId: number;
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

type SpoolChipProps = {
  spool: Spool | null;
  active: boolean;
};

function AmsSpoolChip({ spool, active }: SpoolChipProps) {
  const materialName = spool?.filament.material || "?";

  return (
    <div className="flex flex-col items-center">
      <div
        className={classNames(
          "w-[60px]",
          "h-[60px]",
          active ? styles.active : styles.inactive
        )}
        style={{
          background: spool ? getBackgroundColor(spool) : undefined,
          content: "bla",
        }}
      />
      <span>{materialName}</span>
    </div>
  );
}

function AmsSlot(props: AmsSlotProps) {
  const spool = useQuery<Spool | null>({
    queryKey: ["spool", props.spoolId],
    queryFn: async () => {
      if (props.spoolId == -1) {
        return null;
      }
      const response = await fetch(`/api/spool/${props.spoolId}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    retry: false,
  });

  const resolvedSpool: Spool | null = spool.data != null ? spool.data : null;
  return (
    <>
      <AmsSpoolChip spool={resolvedSpool} active={false} />
    </>
  );
}

export default function AmsConfiguration(props: AmsConfigurationProps) {
  const settings = useSettings();
  const start = props.id * 4;
  const end = start + 4;
  const trays = settings.data?.trays || {};

  const slots = [];
  for (let i = start; i < end; i++) {
    const spool = trays[i.toString()] || -1;
    slots.push(
      <AmsSlot key={i} amsId={props.id} slotId={i - start} spoolId={spool} />
    );
  }

  return (
    <div className="border border-black p-2 rounded-sm">
      <div className="text-xl">AMS {props.id + 1}</div>
      <div className="flex space-x-2 pt-2">{slots}</div>
    </div>
  );
}
