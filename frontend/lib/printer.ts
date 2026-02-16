import { cacheLife } from "next/cache";
import { grpcClient } from "./grpc";
import { type PrinterStatus } from "./types";

const UNDEFINED_RFID_TAG = "00000000000000000000000000000000";

async function getPrinterStatus() {
  "use cache";
  cacheLife("seconds");

  const response = await grpcClient.getPrinterStatus({});
  return response;
}

export async function getPrinterSettings(): Promise<PrinterStatus | null> {
  const status = await getPrinterStatus();
  if (!status.connected) {
    return null;
  }
  return status.status as PrinterStatus;
}

export async function isConnected() {
  const settings = await getPrinterStatus();
  return settings.connected;
}

export async function getRfidTag(tray: number) {
  const amsNum = Math.floor(tray / 4);
  const settings = await getPrinterSettings();
  if (!settings) {
    return null;
  }
  const amsSettings = settings.print?.ams?.ams?.find(
    (a) => a.id == amsNum.toString(),
  );
  if (!amsSettings) {
    return null;
  }
  const traySettings = amsSettings.tray.find((t) => t.id == tray.toString());
  if (!traySettings) {
    return null;
  }
  if (traySettings.tray_uuid === UNDEFINED_RFID_TAG) {
    return null;
  }
  return traySettings.tray_uuid;
}
