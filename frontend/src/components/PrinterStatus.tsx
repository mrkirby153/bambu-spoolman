import { usePrinterStatus } from "@app/hooks/status";
import type { PrinterStatus } from "@app/types";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";

export default function PrinterStatus() {
  const queryClient = useQueryClient();
  const { data } = usePrinterStatus();

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
