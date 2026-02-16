import { TrayConfigForm } from "@/components/tray-config/TrayConfigForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSettings, getSpoolInTray, isLocked } from "@/lib/settings";
import { getAllSpools } from "@/lib/spool";
import { AlertCircle } from "lucide-react";

type Props = {
  amsId?: number;
  trayId: number;
};

export async function SpoolConfiguration(props: Props) {
  const spool = await getSpoolInTray(props.amsId, props.trayId);
  const allSpopols = await getAllSpools();
  const selectedSpools = await getSettings().then((settings) =>
    Object.values(settings.trays),
  );
  if (await isLocked(props.amsId, props.trayId)) {
    return (
      <Alert>
        <AlertCircle />
        <AlertDescription>
          The spool in this tray is automatically selected and cannot be
          changed.
        </AlertDescription>
      </Alert>
    );
  }

  const trayId =
    props.amsId !== undefined ? props.amsId * 4 + props.trayId : props.trayId;

  return (
    <TrayConfigForm
      key={spool?.id}
      spool={spool}
      allSpools={allSpopols}
      trayId={trayId}
      selectedSpools={selectedSpools}
    />
  );
}
