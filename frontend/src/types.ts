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

export type PrinterStatus = {
  print: {
    ams: AmsStatus;
    ams_rfid_status: number;
    ams_status: number;
    bed_target_temper: number;
    bed_temper: number;
    big_fan1_speed: string;
    big_fan2_speed: string;
    cali_version: number;
    chamber_temper: number;
    command: string;
    cooling_fan_speed: string;
    fan_gear: number;
    filam_bak: []; // TODO: What is this?
    flag3: number;
    force_upgrade: boolean;
    gcode_file: string;
    gcode_file_prepare_percente: string;
    gcode_state: string;
    heatbreak_fan_speed: string;
    hms: []; // TODO: What is this?
    home_flag: number;
    hm_switch_state: number;
    ipcam: IpCamStatus;
    k: string;
    layer_num: number;
    lifecycle: string;
    lights_report: LightReport[];
    mc_percent: number;
    mc_print_line_number: string;
    mc_print_stage: string;
    mc_print_sub_stage: number;
    mc_remaining_time: number;
    mess_production_state: string;
    msg: number;
    net: NetConfig;
    nozzle_diameter: number;
    nozzle_target_temper: number;
    nozzle_temper: number;
    nozzle_type: string;
    online: {
      ahb: boolean;
      rfid: boolean;
      version: number;
    };
    print_error: number;
    print_type: string;
    profile_id: string;
    project_id: string;
    queue_est: number;
    queue_number: number;
    queue_sts: number;
    queue_total: number;
    s_obj: []; // TODO: What is this?
    sdcard: boolean;
    sequence_id: string;
    spd_lvl: number;
    spd_mag: number;
    stg: []; // TODO: What is this?
    stg_cur: number;
    subtask_id: string;
    subtask_name: string;
    task_id: string;
    total_layer_num: number;
    upgrade_state: UpgradeState;
    upload: {
      message: string;
      progress: number;
      status: string;
    };
    vt_tray: Tray<"254">;
    wifi_signal: string;
  };
};

export type AmsStatus = {
  ams: Ams[];
  ams_exist_bits: string;
  insert_flag: boolean;
  power_on_flag: boolean;
  try_exist_bits: string;
  tray_is_bbl_bits: string;
  tray_now: string;
  tray_pre: string;
  tray_read_done_bits: string;
  tray_reading_bits: string;
  tray_tar: string;
  version: number;
};

export type Ams = {
  humidity: string;
  id: string;
  temp: string;
  tray: Tray<string>[];
};

export type IpCamStatus = {
  ipcam_dev: string;
  ipcam_record: string;
  mode_bits: number;
  resolution: string;
  timelapse: string;
  tutk_server: string;
};

export type LightReport = {
  mode: string;
  node: string;
};

export type NetConfig = {
  conf: number;
  info: {
    ip: number;
    mask: number;
  }[];
};

export type UpgradeState = {
  consistency_Request: boolean;
  cur_state_code: number;
  dis_state: number;
  err_code: number;
  force_upgrade: boolean;
  idx2: number;
  message: string;
  module: string;
  new_ver_list: [];
  new_version_state: number;
  progress: string;
  sequence_id: number;
  status: string;
};

interface Tray<I> {
  bed_temp: string;
  bed_temp_type: string;
  cali_idx: number;
  cols?: string[];
  id: I;
  k: number;
  n: number;
  nozzle_temp_max: string;
  nozzle_temp_min: string;
  remain: number;
  tray_uid: string;
  tray_color: string;
  tray_diameter: string;
  tray_id_name: string;
  tray_info_idx: string;
  tray_sub_brands: string;
  tray_temp: string;
  tray_type: string;
  tray_uuid: string;
  tray_weight: string;
  xcam_info: string;
}
