import type { Spool } from "@app/types";
import { QueryFunctionContext, useSuspenseQuery } from "@tanstack/react-query";

async function query({ queryKey }: QueryFunctionContext) {
  const [, spoolId] = queryKey;
  if (spoolId == -1 || spoolId == null) {
    return null;
  }
  const response = await fetch(`/api/spool/${spoolId}`);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export function useSpoolQuery(spoolId: number | null) {
  return useSuspenseQuery<Spool | null>({
    queryKey: ["spool", spoolId],
    queryFn: query,
    retry: false,
  });
}
