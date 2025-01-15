import os
import tempfile

import requests
from loguru import logger

from bambu_spoolman.bambu_ftp import retrieve_cached_3mf
from bambu_spoolman.gcode.bambu import extract_gcode
from bambu_spoolman.gcode.parser import evaluate_gcode
from bambu_spoolman.settings import EXTERNAL_SPOOL_ID, load_settings
from bambu_spoolman.spoolman import new_client


class FilamentUsageTracker:

    def __init__(self, handle_in_progress=False):
        self.spoolman_client = new_client()
        self.active_model = None
        self.ams_mapping = None
        self.spent_layers = set()
        self._handle_in_progress_print = handle_in_progress
        self.using_ams = False

    def on_message(self, mqtt_handler, message):
        print_obj = message.get("print", {})
        command = print_obj.get("command")

        if command == "project_file":
            self._handle_print_start(print_obj)

        if command == "push_status":
            if "layer_num" in print_obj:
                self._handle_layer_change(print_obj["layer_num"])

            if "gcode_state" in print_obj and self.active_model is not None:
                if print_obj["gcode_state"] == "FINISH":
                    self._handle_print_end()

            if "gcode_state" in print_obj and self.active_model is None:
                if print_obj["gcode_state"] == "RUNNING":
                    self._handle_in_progress_print(
                        print_obj["gcode_file"], print_obj["layer_num"]
                    )

    def _handle_print_start(self, print_obj):
        logger.info("Print started!")
        model_url = print_obj.get("url")

        self.spent_layers = set()

        if model_url.startswith("http"):
            if print_obj.get("use_ams", False):
                logger.info("Using AMS")
                self.ams_mapping = print_obj.get("ams_mapping", [])
                self.using_ams = True
            else:
                logger.info("Not using AMS")
                self.using_ams = False

            self._load_model(model_url, print_obj.get("param"))

            # Spend layer 0 filament
            self._handle_layer_change(0)
        else:
            logger.warning("Unsupported model URL: {}", model_url)

    def _handle_layer_change(self, layer):
        if self.active_model is None:
            return
        if layer in self.spent_layers:
            return  # Already spent this layer. Probably a full report
        self.spent_layers.add(layer)
        logger.debug("Layer changed to layer {}", layer)
        self._spend_filament_for_layer(layer)

    def _handle_print_end(self):
        logger.info("Print ended!")
        self.active_model = None
        self.ams_mapping = None
        self.using_ams = False

    def _spend_filament_for_layer(self, layer):
        if self.active_model is None:
            return
        logger.debug("Spending filament for layer {}", layer)

        layer_usage = self.active_model.get(int(layer))
        if layer_usage is None:
            logger.error("Failed to find filament usage for layer {}", layer)
            return

        config = load_settings()

        trays = config.get("trays", {})

        for filament, usage in layer_usage.items():
            logger.debug("Spending {}mm of filament {}", usage, filament)

            # Use the external spool ID if we're not using an AMS
            real_mapping = (
                self.ams_mapping[filament] if self.using_ams else EXTERNAL_SPOOL_ID
            )

            logger.debug("Real mapping for filament {} is {}", filament, real_mapping)

            # Load the filament from the configuration
            spoolman_spool = trays.get(str(real_mapping))
            if spoolman_spool is None:
                logger.error("Failed to find tray for filament {}", filament)
                continue

            logger.debug(
                "Spoolman spool for filament {} is {}", filament, spoolman_spool
            )

            # Spend the filament
            self.spoolman_client.consume_spool(spoolman_spool, length=usage)

    def _load_model(self, model_url, gcode):
        logger.debug("Loading model from URL: {}", model_url)

        with tempfile.NamedTemporaryFile(suffix=".3mf") as model_file:
            temp_file_name = model_file.name
            response = requests.get(model_url)

            if response.status_code != 200:
                logger.error("Failed to download model: {}", response.status_code)
                return
            model_file.write(response.content)

            logger.debug("Model downloaded to {}", temp_file_name)

            gcode = extract_gcode(temp_file_name, gcode)

            if gcode is None:
                logger.error("Failed to extract gcode from model")
                return

            logger.debug("Gcode extracted from model")
            self.active_model = evaluate_gcode(gcode)

    def _handle_in_progress_print(self, gcode_filename, current_layer):
        if not self._handle_in_progress_print:
            return
        if self.active_model is not None:
            logger.error(
                "Calling _handle_in_progress_print with an already active print"
            )
            return
        logger.info(
            "Print is already in progress. Attempting to recover from layer {}",
            current_layer,
        )

        cached = retrieve_cached_3mf(gcode_filename)

        if cached is None:
            logger.warning(
                "No cached 3mf file found. Filament usage will not be tracked"
            )
            return

        gcode = extract_gcode(cached)
        if gcode is None:
            logger.error("Failed to extract gcode from cached 3mf")
            return
        logger.debug("Gcode extracted from cached 3mf")
        self.active_model = evaluate_gcode(gcode)

        os.remove(cached)

        # Spend up to the current layer
        for i in range(current_layer + 1):
            self._handle_layer_change(i)
