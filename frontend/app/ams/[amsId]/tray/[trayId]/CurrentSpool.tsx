import { SpoolChip } from "@/components/SpoolChip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSettings } from "@/lib/settings";
import { getSpool } from "@/lib/spool";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  amsId: number;
  trayId: number;
};

export async function CurrentSpool(props: Props) {
  const settings = await getSettings();
  const spoolId = settings.trays[props.trayId];
  if (!spoolId) {
    return (
      <Alert>
        <AlertCircle />
        <AlertDescription>No spool assigned to this tray.</AlertDescription>
      </Alert>
    );
  }
  const spool = await getSpool(settings.trays[props.trayId]?.toString() ?? "");
  const locked = settings.lockedTrays.includes(props.trayId);
  if (!spool) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertDescription>
          Spool {spoolId} not found in Spoolman
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <>
      <div className="flex items-center gap-4">
        <SpoolChip spool={spool} size="large" />
        <div className="font-medium">
          {spool.filament?.material || "Unknown"}
        </div>
        <div className="text-sm text-muted-foreground">
          {spool.remainingWeight}g remaining
        </div>
      </div>

      {locked && <Badge variant="destructive">Locked</Badge>}
      <div className="float-right">
        <Button variant="outline" disabled={locked} className="ml-auto">
          Remove Spool
        </Button>
      </div>
    </>
  );
}
