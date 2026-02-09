"use server";

import { grpcClient } from "@/lib/grpc";
import { getSettings } from "@/lib/settings";
import { revalidateTag } from "next/cache";

export type UpdateTrayAssignmentActionData = {
  error: string | null;
};

export async function updateTrayAssignment(
  trayId: number,
  spoolId: number,
): Promise<UpdateTrayAssignmentActionData> {
  const settings = await getSettings();
  if (settings.lockedTrays.includes(trayId)) {
    return {
      error: "This spool is locked and cannot be modified",
    };
  }
  const existingAssignment = Object.entries(settings.trays).find(
    ([existingTrayId, existingSpoolId]) =>
      Number(existingTrayId) !== trayId && existingSpoolId === spoolId,
  );

  if (existingAssignment) {
    const [conflictTrayId] = existingAssignment;
    return {
      error: `This spool is already assigned to Spool ${(Number(conflictTrayId) % 4) + 1} in AMS ${Math.floor(Number(conflictTrayId) / 4) + 1}`,
    };
  }

  try {
    await grpcClient.updateTray({ spoolId, trayId });
    revalidateTag("settings", "max");
    return {
      error: null,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}
