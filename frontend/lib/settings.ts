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
export async function getSpoolInTray(tray: number) {
  const settings = await getSettings();

  const spoolId = settings.trays[tray];
  if (!spoolId) {
    return null;
  }
  return getSpool(spoolId.toString());
}

export async function isLocked(tray: number) {
  const settings = await getSettings();
  return settings.lockedTrays.includes(tray);
}
