import type { Spool } from "@app/types";
import { useQuery } from "@tanstack/react-query";

export function useSpoolQuery(spoolId: number | null) {
  return useQuery<Spool | null>({
    queryKey: ["spool", spoolId],
    queryFn: async ({ queryKey }) => {
      const [, spoolId] = queryKey;
      if (spoolId == -1 || spoolId == null) {
        return null;
      }
      const response = await fetch(`/api/spool/${spoolId}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    retry: false,
  });
}
