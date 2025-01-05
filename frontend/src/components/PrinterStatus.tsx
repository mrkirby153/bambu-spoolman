import type { PrinterStatus } from "@app/types";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";

type PrinterStatusData = {
  connected: boolean;
  status: PrinterStatus;
  last_update: number;
};

export default function PrinterStatus() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery<PrinterStatusData>({
    queryKey: ["printer-status"],
    queryFn: async () => {
      const response = await fetch("/api/printer-info");
      return response.json();
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["printer-status"],
    });
  };

  return (
    <>
      <h2 className="text-2xl">Printer Status</h2>
      <React.Suspense fallback={<div>Loading...</div>}>
        <button onClick={refresh} className="text-blue-500 hover:underline">
          Refresh
        </button>
        <div>
          Updated: {new Date(data?.last_update * 1000).toLocaleString()}
        </div>
        <ul>
          <li>Connected: {data?.connected ? "Yes" : "No"}</li>
          <li>Printing: {data?.status?.print?.gcode_file || "Nothing"}</li>
          {data?.status?.print?.gcode_state == "RUNNING" && (
            <li>
              Layer: {data?.status?.print?.layer_num} /{" "}
              {data?.status?.print?.total_layer_num}
            </li>
          )}
        </ul>
      </React.Suspense>
    </>
  );
}
