import { useSuspenseQuery } from "@tanstack/react-query";

import type { PrinterStatus } from "@app/types";
export type PrinterStatusData = {
  connected: boolean;
  status: PrinterStatus;
  last_update: number;
};
export function usePrinterStatus() {
  return useSuspenseQuery<PrinterStatusData>({
    queryKey: ["printer-status"],
    queryFn: async () => {
      const response = await fetch("/api/printer-info");
      return response.json();
    },
  });
}

export function useAmsTrayUuid(tray: number) {
  const { data } = usePrinterStatus();

  const ams = tray % 4;
  const ams_tray = Math.floor(tray / 4);
  const ams_tray_uuid = data.status.print.ams.ams[ams]?.tray.filter(
    (t) => t.id == ams_tray.toString(),
  )[0];
  if (!ams_tray_uuid) {
    return null;
  }
  return ams_tray_uuid;
}
