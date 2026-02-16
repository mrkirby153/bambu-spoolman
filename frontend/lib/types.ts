export enum MultiColorDirection {
  LONGITUDINAL = "longitudinal",
  COAXIAL = "coaxial",
}

// Partial type definition for printer status
export type PrinterStatus = {
  print: {
    ams?: {
      ams?: {
        id: string;
        tray: {
          id: string;
          tray_uuid: string;
        }[];
      }[];
    };
  };
};
