import { MultiColorDirection, Spool } from "@app/types";
import styles from "./AmsConfiguration.module.css";
import classNames from "classnames";
import useSettings from "@app/hooks/useSettings";
import { usePopup } from "@app/stores/popupStore";
import SpoolChangeModel from "./models/SpoolChangeModel";
import { useSpoolQuery } from "@app/hooks/spool";

export type AmsConfigurationProps = {
  id: number;
};

type AmsSlotProps = {
  spoolId: number;
  amsId: number;
  slotId: number;
  active: boolean;
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

  let percentage = 100;
  if (spool && spool.remaining_length && spool.used_length) {
    const remainingLength = spool.remaining_length || 1;
    const usedLength = spool.used_length || 1;
    percentage = (remainingLength / (remainingLength + usedLength)) * 100;
  }

  return (
    <div className="flex flex-col items-center">
      <div className={classNames(active ? styles.active : styles.inactive)}>
        <div
          className={classNames("w-[60px]", "h-[60px]")}
          style={{
            clipPath: `inset(${100 - percentage}% 0 0 0)`,
            background: spool ? getBackgroundColor(spool) : undefined,
          }}
        />
      </div>
      <span>{materialName}</span>
    </div>
  );
}

function AmsSlot(props: AmsSlotProps) {
  const spool = useSpoolQuery(props.spoolId);

  const { open } = usePopup();

  const openChangeModel = () => {
    open(
      <SpoolChangeModel trayId={props.slotId} initialSpoolId={props.spoolId} />,
      {
        title: "Update Spool",
      }
    );
  };

  const resolvedSpool: Spool | null = spool.data != null ? spool.data : null;
  return (
    <div onClick={openChangeModel} className="cursor-pointer">
      <AmsSpoolChip spool={resolvedSpool} active={props.active} />
    </div>
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
      <AmsSlot
        key={i}
        amsId={props.id}
        slotId={i}
        spoolId={spool}
        active={i == settings.data?.active_tray}
      />
    );
  }

  return (
    <div className="border border-black p-2 rounded-sm">
      <div className="text-xl">AMS {props.id + 1}</div>
      <div className="flex space-x-2 pt-2 flex-col sm:flex-row">{slots}</div>
    </div>
  );
}
