import { TrayConfigForm } from "@/components/tray-config/TrayConfigForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSpoolInTray, isLocked } from "@/lib/settings";
import { getAllSpools } from "@/lib/spool";
import { AlertCircle } from "lucide-react";

type Props = {
  amsId: number;
  trayId: number;
};

export async function SpoolConfiguration(props: Props) {
  const spool = await getSpoolInTray(props.amsId, props.trayId);
  const allSpopols = await getAllSpools();
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
  return <TrayConfigForm spool={spool} asllSpools={allSpopols} />;
}
