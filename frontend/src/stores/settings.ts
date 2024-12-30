import { create } from "zustand";

const useSettingsStore = create((set) => ({
  trayCount: 4,
  setTrayCount: (trayCount: number) => set({ trayCount }),
}));

export default useSettingsStore;
