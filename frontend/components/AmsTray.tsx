import { Suspense } from "react";
import { SpoolChip } from "./SpoolChip";
import { getSettings } from "@/lib/settings";
import { getSpool } from "@/lib/spool";

type Props = {
  id: number;
};

async function InnerAmsTray({ id }: Props) {
  const settings = await getSettings();
  const tray = settings.trays[id];
  if (!tray) {
    return <SpoolChip spool={null} size="large" />;
  }
  const spool = await getSpool(tray.toString());

  const material = spool?.filament?.material;

  return (
    <div>
      <SpoolChip spool={spool} size="large" />
      {material && <div className="text-center">{material}</div>}
    </div>
  );
}

export default async function AmsTray(props: Props) {
  return (
    <Suspense fallback={<SpoolChip spool={null} size="large" />}>
      <InnerAmsTray {...props} />
    </Suspense>
  );
}
