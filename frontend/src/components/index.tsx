import { useQuery } from "@tanstack/react-query";

export default function Index() {
  const loadSettings = async () => {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      throw new Error("Failed to fetch settings");
    }
    return response.json();
  };

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: loadSettings,
  });

  if (query.isLoading) {
    return <div>Loading...</div>;
  }

  return <div>Trays: {query.data.tray_count}</div>;
}
