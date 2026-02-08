import { cacheLife, cacheTag } from "next/cache";
import { grpcClient } from "./grpc";

export async function getSettings() {
  "use cache";
  cacheLife("seconds");
  cacheTag("settings");

  const response = await grpcClient.getSettings({});
  return response;
}
