import useSettings from "@app/hooks/useSettings";
import { usePopup } from "@app/stores/popupStore";
import SpoolChangeModel from "./models/SpoolChangeModel";
import { useSpoolQuery } from "@app/hooks/spool";
import AmsSpoolChip from "./AmsSpoolChip";
import { Suspense } from "react";
import useChangeStore from "@app/stores/spoolChangeStore";

export type AmsConfigurationProps = {
  id: number;
};

type AmsSlotProps = {
  spoolId: number;
  slotId: number;
  active: boolean;
  locked: boolean;
};

export function AmsSlot(props: AmsSlotProps) {
  const { data: spool } = useSpoolQuery(props.spoolId);
  const { open } = usePopup();
  const { setSpoolId } = useChangeStore();

  const openChangeModel = () => {
    setSpoolId(props.spoolId);
    open(<SpoolChangeModel trayId={props.slotId} locked={props.locked} />, {
      title: "Update Spool",
    });
  };
  return (
    <Suspense fallback={<AmsSpoolChip spool={null} />}>
      <div onClick={openChangeModel} className="cursor-pointer">
        <AmsSpoolChip
          spool={spool}
          active={props.active}
          showUsage
          showMaterial
        />
      </div>
    </Suspense>
  );
}

export default function AmsConfiguration(props: AmsConfigurationProps) {
  const { data } = useSettings();
  const start = props.id * 4;
  const end = start + 4;
  const trays = data.trays || {};
  const locked_trays = data.locked_trays || [];

  const slots = [];
  for (let i = start; i < end; i++) {
    const spool = trays[i.toString()];
    slots.push(
      <AmsSlot
        key={i}
        slotId={i}
        spoolId={spool}
        active={i == data.active_tray}
        locked={locked_trays.includes(i)}
      />,
    );
  }

  return (
    <div className="border border-black p-2 rounded-sm">
      <div className="text-xl">AMS {props.id + 1}</div>
      <div className="flex space-x-2 pt-2 flex-row">{slots}</div>
    </div>
  );
}
