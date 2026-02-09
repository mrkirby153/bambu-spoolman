import { Suspense } from "react";
import { SpoolChip } from "./SpoolChip";
import { getSettings } from "@/lib/settings";
import { getSpool } from "@/lib/spool";
import Link from "next/link";

type Props = {
  id: number;
};

async function InnerAmsTray({ id }: Props) {
  const settings = await getSettings();
  const tray = settings.trays[id];
  const href = `/ams/${Math.floor(id / 4) + 1}/tray/${(id % 4) + 1}`;
  if (!tray) {
    return (
      <Link href={href}>
        <SpoolChip spool={null} size="large" />
      </Link>
    );
  }
  const spool = await getSpool(tray.toString());
  const material = spool?.filament?.material;

  return (
    <Link href={`/ams/${Math.floor(id / 4) + 1}/tray/${(id % 4) + 1}`}>
      <SpoolChip spool={spool} size="large" />
      {material && <div className="text-center">{material}</div>}
    </Link>
  );
}

export default async function AmsTray(props: Props) {
  return (
    <Suspense fallback={<SpoolChip spool={null} size="large" />}>
      <InnerAmsTray {...props} />
    </Suspense>
  );
}
