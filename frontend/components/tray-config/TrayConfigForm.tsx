"use client";

import { Spool } from "@/lib/proto/bambu_spoolman/grpc/spoolman";
import { SpoolRadioGroup } from "./SpoolRadioGroup";
import { Button, ButtonLoading } from "../ui/button";
import { useActionState, useState } from "react";
import {
  updateTrayAssignment,
  type UpdateTrayAssignmentActionData,
} from "./actions";
import { Alert } from "../ui/alert";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  trayId: number;
  spool: Spool | null;
  allSpools: Spool[];
};

export function TrayConfigForm(props: Props) {
  const [selectedSpool, setSelectedSpool] = useState(
    props.spool?.id.toString() ?? "",
  );
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (_prev: UpdateTrayAssignmentActionData) => {
      const result = await updateTrayAssignment(
        props.trayId,
        Number(selectedSpool),
      );

      if (!result.error) {
        router.refresh();
      }

      return result;
    },
    {
      error: null,
    },
  );

  return (
    <>
      <form action={formAction}>
        {state?.error && (
          <Alert variant="destructive" className="mb-5">
            <AlertCircle />
            {state?.error}
          </Alert>
        )}
        <SpoolRadioGroup
          spools={props.allSpools}
          value={selectedSpool}
          onValueChange={(e) => setSelectedSpool(e)}
          disabled={isPending}
        />
        <Button
          variant="default"
          className="mt-4 float-right"
          type="submit"
          disabled={isPending}
        >
          <ButtonLoading loading={isPending} />
          Update
        </Button>
      </form>
    </>
  );
}
