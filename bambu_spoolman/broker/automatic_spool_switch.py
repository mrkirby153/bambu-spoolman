from loguru import logger

from bambu_spoolman.bambu_mqtt import stateful_printer_info
from bambu_spoolman.settings import load_settings, save_settings
from bambu_spoolman.spoolman import new_client

UNKNOWN_TRAY = "00000000000000000000000000000000"


class AutomaticSpoolSwitch:

    _INSTANCE = None

    @classmethod
    def get_instance(cls):
        if cls._INSTANCE is None:
            cls._INSTANCE = AutomaticSpoolSwitch()
        return cls._INSTANCE

    def __init__(self):
        self.spoolman_client = new_client()
        self.tray_mapping = None

    def on_message(self, _mqtt_handler, message):
        print_obj = message.get("print", {})
        command = print_obj.get("command")

        if command == "push_status":
            if "ams" not in print_obj:
                return
            self._sync_trays(print_obj)

    def sync(self):
        if not stateful_printer_info.connected:
            logger.debug("Printer not connected. Skipping sync.")
            return

        print_obj = stateful_printer_info.get_info().get("print", {})
        self.tray_mapping = None
        self._sync_trays(print_obj)

    def _sync_trays(self, print_obj):
        if self.tray_mapping is None:
            # Do an initial sync
            self.tray_mapping = {}
            self._initial_sync(print_obj)
        else:
            # Check if the trays have changed
            self._sync(print_obj)

    def _initial_sync(self, print_obj):
        logger.debug("Initial sync")
        ams = print_obj["ams"]
        ams_data = ams.get("ams", [])

        for data in ams_data:
            for tray in data.get("tray", []):
                tray_id = int(data["id"]) * 4 + int(tray["id"])
                tray_uuid = tray_uuid = tray.get("tray_uuid", None)
                if tray_uuid is None or tray_uuid == UNKNOWN_TRAY:
                    self._unlock_tray(tray_id, clear=False)
                else:
                    spool = self.spoolman_client.lookup_by_tray_uuid(tray_uuid)
                    if spool is not None:
                        spool_id = spool["id"]
                        logger.debug("Found spool {}: {}", spool_id, spool)
                        self._lock_spool(tray_id, spool_id)
                    else:
                        logger.debug("Spool {} not found", tray_uuid)
                        self._unlock_tray(tray_id, clear=False)
                self.tray_mapping[tray_id] = tray_uuid

    def _sync(self, print_obj):
        prev_tray_mapping = self.tray_mapping.copy()
        ams = print_obj["ams"]
        ams_data = ams.get("ams", [])

        for data in ams_data:
            for tray in data.get("tray", []):
                tray_id = int(data["id"]) * 4 + int(tray["id"])
                tray_uuid = tray.get("tray_uuid", None)

                prev = prev_tray_mapping.get(tray_id, None)
                logger.debug("Tray {}: {} -> {}", tray_id, prev, tray_uuid)
                if prev != tray_uuid:
                    if (
                        tray_uuid == UNKNOWN_TRAY or tray_uuid is None
                    ) and prev is not None:
                        # Tray was removed. Unlock the spool and clear the mapping
                        logger.debug("Unlocking tray {}: {}", tray_id, prev)
                        self._unlock_tray(tray_id, clear=True)
                    if prev != tray_uuid:
                        # Spool was changed. Update the mapping and lock if it exists
                        logger.debug("Tray changed. Looking up spool {}", tray_uuid)
                        spool = self.spoolman_client.lookup_by_tray_uuid(tray_uuid)
                        if spool is not None:
                            spool_id = spool["id"]
                            logger.debug("Found spool {}: {}", spool_id, spool)
                            self._lock_spool(tray_id, spool_id)
                        else:
                            logger.debug("Spool {} not found", tray_uuid)

                self.tray_mapping[tray_id] = tray_uuid

    def _lock_spool(self, tray_id, spool_id):
        settings = load_settings()
        trays = settings.get("trays", {})
        trays[str(tray_id)] = spool_id
        settings["trays"] = trays
        settings["locked_trays"] = list(
            set(settings.get("locked_trays", []) + [tray_id])
        )
        save_settings(settings)
        logger.debug("Locked tray {}: {}", tray_id, spool_id)

        # Set active tray in Spoolman
        # tray_id is calculated as: ams_id * 4 + tray_slot_id (0-indexed)
        # So we need to reverse it to get ams_id and tray_slot_id
        # AMS is 0-indexed, but tray should be 1-indexed (1-4)
        ams_id = tray_id // 4
        tray_slot_id = (tray_id % 4) + 1
        active_tray_id = f"ams_{ams_id}_tray_{tray_slot_id}"

        try:
            self.spoolman_client.set_active_tray(spool_id, active_tray_id)
            logger.info("Set tray field for spool {} to {}", spool_id, active_tray_id)
        except Exception as e:
            logger.error("Failed to set tray field for spool {}: {}", spool_id, e)

    def _unlock_tray(self, tray_id, clear=False):
        settings = load_settings()
        locked = settings.get("locked_trays", [])
        if tray_id not in locked:
            return
        locked.remove(tray_id)

        # Get the spool_id before clearing if we need to clear the tray field in Spoolman
        spool_id = None
        if clear:
            trays = settings.get("trays", {})
            spool_id = trays.get(str(tray_id))
            if tray_id in trays:
                del trays[tray_id]
                settings["trays"] = trays

        settings["locked_trays"] = locked
        save_settings(settings)
        logger.debug("Unlocked tray {}: {}", tray_id, locked)

        # Clear the tray field in Spoolman if we're clearing the local mapping
        if clear and spool_id is not None:
            try:
                self.spoolman_client.set_active_tray(spool_id, "")
                logger.info("Cleared tray field for spool {}", spool_id)
            except Exception as e:
                logger.error("Failed to clear tray field for spool {}: {}", spool_id, e)
