export type Spool = {
  archived: boolean;
  extra: Map<string, string>;
  id: number;
  initial_weight: number;
  registered: string;
  remaining_length: number;
  remaining_weight: number;
  spool_weight: number;
  used_length: number;
  used_weight: number;
  filament: Filament;
};

export enum MultiColorDirection {
  LONGITUDINAL = "longitudinal",
  COAXIAL = "coaxial",
}

export type Filament = {
  color_hex: string;
  density: number;
  diameter: number;
  external_id: string;
  extra: Map<string, string>;
  id: number;
  material: string;
  multi_color_direction?: MultiColorDirection;
  multi_color_hexes?: string;
  name: string;
  registered: string;
  settings_bed_temp: number;
  settings_extruder_temp: number;
  spool_weight: number;
  vendor: Vendor;
  weight: number;
};

export type Vendor = {
  external_id: string;
  extra: Map<string, string>;
  id: number;
  name: string;
  registered: string;
};
