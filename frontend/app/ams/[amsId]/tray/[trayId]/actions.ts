"use server";

import { grpcClient } from "@/lib/grpc";

export async function clearSpool(trayId: number): Promise<void> {
  await grpcClient.updateTray({ trayId, spoolId: -1 });
}
