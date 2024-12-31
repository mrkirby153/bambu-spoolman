import useDebounce from "@app/hooks/debounce";
import { useSpoolQuerySuspense } from "@app/hooks/spool";
import { usePopup } from "@app/stores/popupStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";

export type FilamentChangeModelProps = {
  trayId: number;
  initialSpoolId: number;
};

export default function SpoolChangeModel(props: FilamentChangeModelProps) {
  const { close } = usePopup();
  const [spoolId, setSpoolId] = useState<number | null>(props.initialSpoolId);
  const debounced = useDebounce(spoolId, 500);
  const { data: spoolData, isLoading } = useSpoolQuerySuspense(debounced);
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: async () => {},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      close();
    },
  });

  const updateTray = () => {
    console.log("Updating tray to spool", debounced);
    updateMutation.mutate();
  };

  return (
    <>
      <input
        type="number"
        placeholder="Spool ID"
        value={spoolId?.toString()}
        onChange={(e) => setSpoolId(Number(e.target.value))}
      />
      <Suspense fallback={<div>Loading...</div>}>
        {spoolData ? (
          <div>
            <span>Material: {spoolData.filament.material}</span>
            <span>Name: {spoolData.filament.name}</span>
          </div>
        ) : (
          <div>Spool not found</div>
        )}
      </Suspense>
      <div className="flex flex-row items-center gap-1">
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={close}
        >
          Cancel
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-200 disabled:cursor-not-allowed"
          disabled={spoolData == null || isLoading}
          onClick={updateTray}
        >
          Update
        </button>
      </div>
    </>
  );
}
