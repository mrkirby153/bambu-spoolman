"use client";

import { Spool } from "@/lib/proto/bambu_spoolman/grpc/spoolman";
import { SpoolRadioGroup } from "./SpoolRadioGroup";
import { Button } from "../ui/button";

type Props = {
  spool: Spool | null;
  asllSpools: Spool[];
};

export function TrayConfigForm(props: Props) {
  return (
    <>
      <SpoolRadioGroup spools={props.asllSpools} />
      <Button variant="default" className="mt-4 float-right">
        Update
      </Button>
    </>
  );
}
