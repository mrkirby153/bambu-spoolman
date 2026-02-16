import { grpcClient } from "./grpc";

export async function supportsTrayLocking() {
  const info = await grpcClient.info({});
  return info.features?.trayLocking ?? false;
}
