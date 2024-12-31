import { create } from "zustand";
import React from "react";

export type PopupProperties = {
  clickToClose?: boolean;
  title?: string;
};

interface PopupStore {
  isOpen: boolean;
  data: React.ReactNode | null;
  properties: PopupProperties | null;
  close: () => void;
  open: (data: React.ReactNode, properties?: PopupProperties) => void;
}

export const usePopupStore = create<PopupStore>((set) => ({
  isOpen: false,
  data: null,
  properties: null,
  close: () => set({ isOpen: false, data: null, properties: null }),
  open: (data, properties) => set({ isOpen: true, data, properties }),
}));
