import { grpcClient } from "@/lib/grpc";

export default async function Home() {
  const response = await grpcClient.info({});
  console.log("gRPC response:", response);
  return <pre>{JSON.stringify(response, null, 2)}</pre>;
}
