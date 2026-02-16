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

/**
 * Gets the spool in a tray
 * @param tray The tray to get
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
