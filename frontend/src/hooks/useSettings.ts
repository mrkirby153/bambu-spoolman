import { useQuery } from "@tanstack/react-query";

async function load() {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error("Failed to fetch settings");
  }
  return response.json();
}

export default function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: load,
  });
}
