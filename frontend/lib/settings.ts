import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { grpcClient } from "./grpc";
import { getSpool } from "./spool";

export async function revalidateSettings() {
  "use server";
  revalidateTag("settings", "max");
}

export async function getSettings() {
  "use cache";
  cacheLife("seconds");
  cacheTag("settings");

  const response = await grpcClient.getSettings({});
  return response;
}

function getTrayIndex(ams: number, tray: number) {
  return ams * 4 + tray;
}

/**
 * Gets the spool in a tray
 * @param ams A 0-indexed AMS number
 * @param tray A 0-indexed AMS number
 * @returns The Spool in a tray, if any
 */
export async function getSpoolInTray(ams: number, tray: number) {
  const settings = await getSettings();

  const base = ams * 4;
  const trayIndex = base + tray;

  const spoolId = settings.trays[trayIndex];
  if (!spoolId) {
    return null;
  }
  return getSpool(spoolId.toString());
}

export async function isLocked(ams: number, tray: number) {
  const settings = await getSettings();
  const trayIndex = getTrayIndex(ams, tray);
  return settings.lockedTrays.includes(trayIndex);
}
