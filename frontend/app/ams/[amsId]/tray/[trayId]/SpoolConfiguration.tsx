import { TrayConfigForm } from "@/components/tray-config/TrayConfigForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSettings, getSpoolInTray, isLocked } from "@/lib/settings";
import { getAllSpools } from "@/lib/spool";
import { AlertCircle } from "lucide-react";

type Props = {
  trayId: number;
};

export async function SpoolConfiguration(props: Props) {
  const spool = await getSpoolInTray(props.trayId);
  const allSpopols = await getAllSpools();
  const selectedSpools = await getSettings().then((settings) =>
    Object.values(settings.trays),
  );
  if (await isLocked(props.trayId)) {
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

  return (
    <TrayConfigForm
      key={spool?.id}
      spool={spool}
      allSpools={allSpopols}
      trayId={props.trayId}
      selectedSpools={selectedSpools}
    />
  );
}
