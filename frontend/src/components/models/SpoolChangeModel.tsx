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

export type FilamentChangeModelProps = {
  trayId: number;
  initialSpoolId: number;
};

type SpoolInformationProps = {
  spool: Spool;
};

type ChangeStore = {
  error: string | null;
  setError(error: string | null): void;
};

const useChangeStore = create<ChangeStore>((set) => ({
  error: null,
  setError: (error) => set({ error }),
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

const urlRegex = /https?:\/\/.*\/(\d+)/;
const spoolmanRegex = /web\+spoolman:s-(\d+)/;

export default function SpoolChangeModel(props: FilamentChangeModelProps) {
  const { close } = usePopup();
  const { error, setError } = useChangeStore();
  const [spoolId, setSpoolId] = useState<number | null>(props.initialSpoolId);
  const debounced = useDebounce(spoolId, 500);
  const { data: spoolData } = useSpoolQuery(debounced);
  const queryClient = useQueryClient();
  const updateMutation = useMutation<
    void,
    Error,
    {
      trayId: number;
      spoolId: number | null;
    }
  >({
    mutationFn: async ({ trayId, spoolId }) => {
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
  const cameras = useDevices();
  const [scan, setScan] = useState(false);

  useEffect(() => {
    if (updateMutation.error) {
      setError(updateMutation.error.message);
    }
  }, [updateMutation.error, setError]);

  const updateTray = () => {
    updateMutation.mutate({ trayId: props.trayId, spoolId: debounced });
  };

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
      setScan(false);
      return;
    }
    setScan(false);
    setError(null);
    updateMutation.reset();
  };

  const toDisplay = scan ? (
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
  ) : (
    <SpoolDetails spoolId={debounced} />
  );

  const onSpoolIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMutation.reset();
    setError(null);
    setSpoolId(Number(e.target.value));
  };

  return (
    <>
      <div>
        <label className="font-bold mr-1">Spool ID:</label>
        <input
          type="number"
          className="border border-gray-300 p-1 rounded"
          placeholder="Spool ID"
          value={spoolId?.toString()}
          onChange={onSpoolIdChange}
        />
        {error && <div className="text-red-500">{error}</div>}
      </div>
      {cameras.length != 0 && (
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mt-2 disabled:bg-blue-200 disabled:cursor-not-allowed"
          onClick={() => setScan(!scan)}
        >
          Scan QR Code
        </button>
      )}

      {toDisplay}

      <div className="flex flex-row items-center gap-1">
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={close}
        >
          Cancel
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-200 disabled:cursor-not-allowed"
          disabled={spoolData == null || updateMutation.isError}
          onClick={updateTray}
        >
          Update
        </button>
      </div>
    </>
  );
}
