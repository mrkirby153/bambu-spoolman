import { create } from "zustand";

type ChangeStore = {
  error: string | null;
  spoolId: number | null;
  scanning: boolean;
  setError(error: string | null): void;
  setSpoolId(spoolId: number | null): void;
  setScanning(scanning: boolean): void;
};

export default create<ChangeStore>((set) => ({
  error: null,
  spoolId: null,
  scanning: false,
  setError: (error) => set({ error }),
  setSpoolId: (spoolId) => set({ spoolId }),
  setScanning: (scanning) => set({ scanning }),
}));
