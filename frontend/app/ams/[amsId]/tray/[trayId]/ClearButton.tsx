"use client";

import { Button } from "@/components/ui/button";
import { clearSpool } from "./actions";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  amsId: number;
  trayId: number;
  locked: boolean;
};

export function ClearButton({ amsId, trayId, locked }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const handleClear = async () => {
    setLoading(true);
    try {
      await clearSpool(amsId * 4 + trayId);
      router.refresh();
    } catch (error) {
      console.error("Failed to clear spool:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      disabled={locked || loading}
      className="ml-auto"
      onClick={handleClear}
    >
      Remove Spool
    </Button>
  );
}
