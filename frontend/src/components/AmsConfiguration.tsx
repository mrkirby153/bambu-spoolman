import type { Spool } from "@app/types";
import styles from "./AmsConfiguration.module.css";
import useSettings from "@app/hooks/useSettings";
import { usePopup } from "@app/stores/popupStore";
import SpoolChangeModel from "./models/SpoolChangeModel";
import { useSpoolQuery } from "@app/hooks/spool";
import AmsSpoolChip from "./AmsSpoolChip";

export type AmsConfigurationProps = {
  id: number;
};

type AmsSlotProps = {
  spoolId: number;
  amsId: number;
  slotId: number;
  active: boolean;
};

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
      <AmsSpoolChip
        spool={resolvedSpool}
        borderStyle={props.active ? styles.active : styles.inactive}
        showUsage
        showMaterial
      />
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
