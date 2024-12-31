import { MultiColorDirection, Spool } from "@app/types";
import { useQuery } from "@tanstack/react-query";

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
  }
}

function AmsSlot(props: AmsSlotProps) {
  const spool = useQuery<Spool>({
    queryKey: ["spool", props.spoolId],
    queryFn: async () => {
      const response = await fetch(`/api/spool/${props.spoolId}`);
      return response.json();
    },
    retry: false,
  });

  return (
    <div>
      <div
        className="w-[30px] h-[30px]"
        style={{
          background: spool.data ? getBackgroundColor(spool.data) : "gray",
        }}
      />
    </div>
  );
}

export default function AmsConfiguration(props: AmsConfigurationProps) {
  return (
    <div>
      <div className="text-xl">AMS {props.id + 1}</div>
      <div className="flex space-x-2">
        <AmsSlot amsId={props.id} slotId={0} spoolId={1} />
        <AmsSlot amsId={props.id} slotId={1} spoolId={2} />
        <AmsSlot amsId={props.id} slotId={2} spoolId={3} />
        <AmsSlot amsId={props.id} slotId={3} spoolId={4} />
      </div>
    </div>
  );
}
