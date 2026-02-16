"use server";

import { grpcClient } from "@/lib/grpc";
import { revalidateTag } from "next/cache";

export async function clearSpool(trayId: number): Promise<void> {
  await grpcClient.updateTray({ trayId, spoolId: -1 });
}

export async function lockTray(spoolId: number, uuid: string) {
  await grpcClient.setTrayUUID({ spoolId, uuid });
  revalidateTag("settings", "max");
}
