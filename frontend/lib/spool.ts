import { cacheLife, cacheTag } from "next/cache";
import { grpcClient } from "./grpc";

function getCacheTag(id: string) {
  return `spool-${id}`;
}

export async function getSpool(id: string) {
  "use cache";
  cacheLife("seconds");
  cacheTag(getCacheTag(id));

  const response = await grpcClient.getSpools({ spoolId: [id] });
  if (response.spools.length === 0) {
    return null;
  }
  return response.spools[0];
}
