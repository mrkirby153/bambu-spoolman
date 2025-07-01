import useDebounce from "@app/hooks/debounce";
import { useSpoolQuery } from "@app/hooks/spool";
import { usePopup } from "@app/stores/popupStore";
import { Spool } from "@app/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import AmsSpoolChip from "../AmsSpoolChip";
import {
  IDetectedBarcode,
  Scanner,
  useDevices,
} from "@yudiel/react-qr-scanner";
import Button from "../Button";
import Input from "../Input";
import useChangeStore from "@app/stores/spoolChangeStore";
import { useAmsTrayUuid } from "@app/hooks/status";

export type FilamentChangeModelProps = {
  locked: boolean;
  trayId: number;
};

type SpoolInformationProps = {
  spool: Spool;
};

function mmToMeter(mm: number) {
  return mm / 1000;
}

function SpoolInformation({ spool }: SpoolInformationProps) {
  return (
    <div className="flex flex-col">
      <h2 className="text-md pb-2 font-bold">
        {spool.filament.vendor.name} - {spool.filament.name}
      </h2>
      <AmsSpoolChip spool={spool} showUsage />
      <div>
        <span className="font-bold">Material: </span>
        {spool.filament.material}
      </div>
      <div>
        <span className="font-bold">Remaining Length: </span>
        {mmToMeter(spool.remaining_length).toFixed(2)}m
      </div>
      <div>
        <span className="font-bold">Remaining Weight: </span>
        {spool.remaining_weight.toFixed(2)}g
      </div>
    </div>
  );
}

type SpoolDetailsProps = {
  spoolId: number | null;
};

function SpoolDetails(props: SpoolDetailsProps) {
  const { data: spoolData } = useSpoolQuery(props.spoolId);
  if (props.spoolId == null) {
    return <div className="my-3"></div>;
  }
  return (
    <div className="my-3">
      <Suspense fallback={<div>Loading...</div>}>
        {spoolData ? (
          <SpoolInformation spool={spoolData} />
        ) : (
          <div>Spool not found</div>
        )}
      </Suspense>
    </div>
  );
}

function QrCodeScanner() {
  const { setSpoolId, setError, setScanning } = useChangeStore();
  const handleScan = (result: IDetectedBarcode[]) => {
    const rawText = result[0].rawValue;
    const urlMatch = rawText.match(urlRegex);
    const spoolmanMatch = rawText.match(spoolmanRegex);
    if (urlMatch) {
      setSpoolId(Number(urlMatch[1]));
    } else if (spoolmanMatch) {
      setSpoolId(Number(spoolmanMatch[1]));
    } else {
      setError("Invalid QR Code");
      setScanning(false);
      return;
    }
    setScanning(false);
    setError(null);
  };
  return (
    <div className="p-3">
      <Scanner
        onScan={handleScan}
        formats={["qr_code"]}
        components={{
          audio: false,
          torch: false,
        }}
      />
    </div>
  );
}

function QrCodeButton() {
  const { setScanning, scanning } = useChangeStore();
  const cameras = useDevices();
  if (cameras.length == 0) {
    return null;
  }
  return (
    <Button
      intent="primary"
      onClick={() => setScanning(!scanning)}
      className="mt-2"
    >
      {scanning ? "Stop Scanning" : "Scan QR Code"}
    </Button>
  );
}

const urlRegex = /https?:\/\/.*\/(\d+)/;
const spoolmanRegex = /web\+spoolman:s-(\d+)/;

export default function SpoolChangeModel(props: FilamentChangeModelProps) {
  const { close } = usePopup();
  const { error, setError, scanning, spoolId, setSpoolId } = useChangeStore();
  const debouncedSpoolId = useDebounce(spoolId, 500);
  const { data: spoolData } = useSpoolQuery(debouncedSpoolId);
  const trayUuid = useAmsTrayUuid(props.trayId);

  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: async ({
      trayId,
      spoolId,
    }: {
      trayId: number;
      spoolId: number | null;
    }) => {
      const result = await fetch(`/api/tray/${trayId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spool_id: spoolId }),
      });
      if (!result.ok) {
        const error = await result.json();
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      doClose();
    },
  });

  const uuidMutation = useMutation({
    mutationFn: async ({ spoolId }: { spoolId: number }) => {
      const result = await fetch(`/api/set-uuid/${spoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tray_uuid: trayUuid?.tray_uuid,
        }),
      });
      if (!result.ok) {
        const error = await result.json();
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      doClose();
    },
  });

  // Sync mutation errors to the store
  useEffect(() => {
    if (updateMutation.error) {
      setError(updateMutation.error.message);
    }
    if (uuidMutation.error) {
      setError(uuidMutation.error.message);
    }
  }, [updateMutation.error, uuidMutation.error, setError]);

  const doClose = () => {
    close();
    setError(null);
  };

  const updateTray = () => {
    updateMutation.mutate({ trayId: props.trayId, spoolId: debouncedSpoolId });
  };

  const onSpoolIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMutation.reset();
    setError(null);
    setSpoolId(Number(e.target.value));
  };

  const removeSpool = () => {
    updateMutation.mutate({ trayId: props.trayId, spoolId: null });
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <label className="font-bold mr-1">Spool ID:</label>
        <Input
          type="number"
          className="border border-gray-300 p-1 rounded"
          placeholder="Spool ID"
          value={spoolId?.toString()}
          onChange={onSpoolIdChange}
          disabled={props.locked}
        />
        {error && <div className="text-red-500">{error}</div>}
      </div>

      {trayUuid && (
        <>
          <div className="font-bold mt-2">RFID Tag:</div>
          <pre>{trayUuid?.tray_uuid}</pre>
        </>
      )}

      <QrCodeButton />

      {scanning ? (
        <QrCodeScanner />
      ) : (
        <SpoolDetails spoolId={debouncedSpoolId} />
      )}

      {!props.locked && (
        <>
          <div className="flex flex-row items-center gap-1">
            <Button intent="danger" onClick={doClose}>
              Cancel
            </Button>
            <Button
              intent="neutral"
              onClick={removeSpool}
              disabled={spoolId == null || props.locked}
            >
              Remove Spool
            </Button>
            <Button
              intent="primary"
              onClick={updateTray}
              disabled={
                spoolData == null || updateMutation.isError || props.locked
              }
            >
              Update
            </Button>
          </div>
          <div className="flex flex-row items-center gap-1 pt-2">
            {trayUuid && (
              <Button
                intent="neutral"
                onClick={() => {
                  if (trayUuid) {
                    uuidMutation.mutate({ spoolId: debouncedSpoolId || 0 });
                  }
                }}
                disabled={
                  uuidMutation.isError ||
                  updateMutation.isError ||
                  props.locked ||
                  spoolData == null
                }
              >
                Set RFID Tag
              </Button>
            )}
          </div>
        </>
      )}
    </Suspense>
  );
}
