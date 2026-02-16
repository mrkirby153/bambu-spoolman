import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { grpcClient } from "./grpc";
import { getSpool } from "./spool";
import { getTrayIndex } from "./client/settings";

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

/**
 * Gets the spool in a tray
 * @param ams A 0-indexed AMS number
 * @param tray A 0-indexed AMS number
 * @returns The Spool in a tray, if any
 */
export async function getSpoolInTray(ams: number | undefined, tray: number) {
  const settings = await getSettings();

  const trayIndex = ams !== undefined ? getTrayIndex(ams, tray) : tray;

  const spoolId = settings.trays[trayIndex];
  if (!spoolId) {
    return null;
  }
  return getSpool(spoolId.toString());
}

export async function isLocked(ams: number | undefined, tray: number) {
  const settings = await getSettings();
  const trayIndex = ams !== undefined ? getTrayIndex(ams, tray) : tray;
  return settings.lockedTrays.includes(trayIndex);
}
