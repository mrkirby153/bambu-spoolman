import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

async function load() {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error("Failed to fetch settings");
  }
  return response.json();
}

type Trays = {
  [key: string]: number;
};
export type Settings = {
  tray_count: number;
  trays: Trays;
  active_tray: number | null;
};

export default function useSettings() {
  return useSuspenseQuery<Settings>({
    queryKey: ["settings"],
    queryFn: load,
  });
}
