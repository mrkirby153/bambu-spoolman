import useDebounce from "@app/hooks/debounce";
import { useSpoolQuery, useSpoolQuerySuspense } from "@app/hooks/spool";
import { usePopup } from "@app/stores/popupStore";
import { Spool } from "@app/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import AmsSpoolChip from "../AmsSpoolChip";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";

export type FilamentChangeModelProps = {
  trayId: number;
  initialSpoolId: number;
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
        {spool.remaining_weight}g
      </div>
    </div>
  );
}

type SpoolDetailsProps = {
  spoolId: number | null;
};

function SpoolDetails(props: SpoolDetailsProps) {
  const { data: spoolData } = useSpoolQuerySuspense(props.spoolId);
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

  const [scan, setScan] = useState(false);

  const updateTray = () => {
    updateMutation.mutate({ trayId: props.trayId, spoolId: debounced });
  };

  const handleScan = (result: IDetectedBarcode[]) => {
    const rawText = result[0].rawValue;
    const urlMatch = rawText.match(urlRegex);
    if (urlMatch) {
      setSpoolId(Number(urlMatch[1]));
    }
    const spoolmanMatch = rawText.match(spoolmanRegex);
    if (spoolmanMatch) {
      setSpoolId(Number(spoolmanMatch[1]));
    }
    setScan(false);
    updateMutation.reset();
  };

  const toDisplay = scan ? (
    <div className="p-3">
      <Scanner onScan={handleScan} />
    </div>
  ) : (
    <SpoolDetails spoolId={debounced} />
  );

  const onSpoolIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMutation.reset();
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
        {updateMutation.isError && (
          <div className="text-red-500">{updateMutation.error?.message}</div>
        )}
      </div>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mt-2"
        onClick={() => setScan(!scan)}
      >
        Scan QR Code
      </button>

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
