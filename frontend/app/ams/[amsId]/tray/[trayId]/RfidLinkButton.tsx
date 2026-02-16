"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { lockTray } from "./actions";
import { useRouter } from "next/navigation";

type Props = {
  spoolId: number;
  uuid: string;
};

export function RfidLinkButton({ spoolId, uuid }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onClick = async () => {
    setLoading(true);
    try {
      await lockTray(spoolId, uuid);
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <Button
      variant="default"
      className="mt-4"
      onClick={onClick}
      disabled={loading}
    >
      Link Selected Spool to RFID Tag
    </Button>
  );
}
