import { createChannel, createClient } from "nice-grpc";

import { BambuSpoolmanDefinition } from "@proto/bambu_spoolman/grpc/bambu_spoolman";

const channel = createChannel(
  process.env.GRPC_SERVER_URL || "http://localhost:50051",
);

export const grpcClient = createClient(BambuSpoolmanDefinition, channel);
