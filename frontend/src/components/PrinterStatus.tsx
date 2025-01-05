import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";

export default function PrinterStatus() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
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
        <button onClick={refresh}>Refresh</button>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </React.Suspense>
    </>
  );
}
