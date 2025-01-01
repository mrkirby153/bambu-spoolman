import useDebounce from "@app/hooks/debounce";
import { useSpoolQuery } from "@app/hooks/spool";
import { usePopup } from "@app/stores/popupStore";
import { Spool } from "@app/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import AmsSpoolChip from "../AmsSpoolChip";
import {
  IDetectedBarcode,
  Scanner,
  useDevices,
} from "@yudiel/react-qr-scanner";
import { create } from "zustand";
import Button from "../Button";
import Input from "../Input";

export type FilamentChangeModelProps = {
  trayId: number;
  initialSpoolId: number;
};

type SpoolInformationProps = {
  spool: Spool;
};

type ChangeStore = {
  error: string | null;
  spoolId: number | null;
  scanning: boolean;
  setError(error: string | null): void;
  setSpoolId(spoolId: number | null): void;
  setScanning(scanning: boolean): void;
};

const useChangeStore = create<ChangeStore>((set) => ({
  error: null,
  spoolId: null,
  scanning: false,
  setError: (error) => set({ error }),
  setSpoolId: (spoolId) => set({ spoolId }),
  setScanning: (scanning) => set({ scanning }),
}));

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
        {spool.remaining_weight}g
      </div>
    </div>
  );
}

type SpoolDetailsProps = {
  spoolId: number | null;
};

function SpoolDetails(props: SpoolDetailsProps) {
  const { data: spoolData } = useSpoolQuery(props.spoolId);
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
      variant="primary"
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
  const { error, setError, scanning } = useChangeStore();
  const [spoolId, setSpoolId] = useState<number | null>(props.initialSpoolId);
  const debounced = useDebounce(spoolId, 500);
  const { data: spoolData } = useSpoolQuery(debounced);
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
      close();
    },
  });
  // Sync mutation errors to the store
  useEffect(() => {
    if (updateMutation.error) {
      setError(updateMutation.error.message);
    }
  }, [updateMutation.error, setError]);

  const updateTray = () => {
    updateMutation.mutate({ trayId: props.trayId, spoolId: debounced });
  };

  const onSpoolIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMutation.reset();
    setError(null);
    setSpoolId(Number(e.target.value));
  };

  return (
    <>
      <div>
        <label className="font-bold mr-1">Spool ID:</label>
        <Input
          type="number"
          className="border border-gray-300 p-1 rounded"
          placeholder="Spool ID"
          value={spoolId?.toString()}
          onChange={onSpoolIdChange}
        />
        {error && <div className="text-red-500">{error}</div>}
      </div>

      <QrCodeButton />

      {scanning ? <QrCodeScanner /> : <SpoolDetails spoolId={debounced} />}

      <div className="flex flex-row items-center gap-1">
        <Button variant="danger" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={updateTray}
          disabled={spoolData == null || updateMutation.isError}
        >
          Update
        </Button>
      </div>
    </>
  );
}
