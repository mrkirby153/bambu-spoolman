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
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { useCameraAvailable } from "@/lib/hooks/useCameraAvailable";

const URL_REGEX = /https?:\/\/.*\/(\d+)/i;
const SPOOL_ID_REGEX = /web\+spoolman:s-(\d+)/i;

type Props = {
  trayId: number;
  spool: Spool | null;
  allSpools: Spool[];
  selectedSpools: number[];
};

type QrScannerProps = {
  onScan: (result: IDetectedBarcode[]) => void;
  cancelScan: () => void;
};

function QrScanner(props: QrScannerProps) {
  return (
    <>
      <Scanner
        onScan={props.onScan}
        formats={["qr_code"]}
        components={{
          torch: false,
        }}
      />
      <Button variant="destructive" className="mt-4" onClick={props.cancelScan}>
        Cancel Scanning
      </Button>
    </>
  );
}

export function TrayConfigForm(props: Props) {
  const [selectedSpool, setSelectedSpool] = useState(
    props.spool?.id.toString() ?? "",
  );
  const [changed, setChanged] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const cameraAvailable = useCameraAvailable();
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

  const getSpoolId = (result: IDetectedBarcode) => {
    const urlMatch = result.rawValue.match(URL_REGEX);
    if (urlMatch) {
      return Number(urlMatch[1]);
    }
    const spoolIdMatch = result.rawValue.match(SPOOL_ID_REGEX);
    if (spoolIdMatch) {
      return Number(spoolIdMatch[1]);
    }
    return null;
  };

  const handleScan = (result: IDetectedBarcode[]) => {
    if (result.length === 0) {
      setQrScanError("No QR code detected. Please try again.");
      return;
    }
    if (result.length > 1) {
      setQrScanError(
        "Multiple QR codes detected. Please ensure only one QR code is visible to the camera.",
      );
      return;
    }
    const spoolId = getSpoolId(result[0]);
    if (!spoolId) {
      setQrScanError("Invalid QR code format.");
      return;
    }
    setSelectedSpool(spoolId.toString());
    setChanged(true);
    setQrScanning(false);
  };

  return (
    <>
      {qrScanError && (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle />
          {qrScanError}
        </Alert>
      )}
      {qrScanning ? (
        <QrScanner
          onScan={handleScan}
          cancelScan={() => setQrScanning(false)}
        />
      ) : (
        <>
          {cameraAvailable && (
            <Button
              className="w-full mb-2"
              onClick={() => {
                setQrScanError(null);
                setQrScanning(true);
              }}
            >
              Scan QR Code
            </Button>
          )}
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
              onValueChange={(e) => {
                setSelectedSpool(e);
                setChanged(true);
              }}
              disabled={isPending}
              selected={props.selectedSpools}
              initialSpool={props.spool}
            />
            <Button
              variant="default"
              className="mt-4 float-right"
              type="submit"
              disabled={isPending || !changed}
            >
              <ButtonLoading loading={isPending} />
              Update
            </Button>
          </form>
        </>
      )}
    </>
  );
}
