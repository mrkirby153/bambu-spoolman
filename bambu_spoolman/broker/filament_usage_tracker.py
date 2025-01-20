import tempfile

import requests
from loguru import logger

from bambu_spoolman.gcode.bambu import extract_gcode
from bambu_spoolman.gcode.parser import evaluate_gcode
from bambu_spoolman.settings import EXTERNAL_SPOOL_ID, load_settings
from bambu_spoolman.spoolman import new_client


class FilamentUsageTracker:

    def __init__(self):
        self.spoolman_client = new_client()
        self.active_model = None
        self.ams_mapping = None
        self.spent_layers = set()
        self.using_ams = False

        self.gcode_state = None

    def on_message(self, mqtt_handler, message):
        print_obj = message.get("print", {})
        command = print_obj.get("command")

        previous_gcode_state = self.gcode_state
        self.gcode_state = print_obj.get("gcode_state", self.gcode_state)

        if previous_gcode_state != self.gcode_state:
            logger.info("Gcode state: {} -> {}", previous_gcode_state, self.gcode_state)

        if command == "project_file":
            self._handle_print_start(print_obj)

        if command == "push_status":
            if "layer_num" in print_obj:
                self._handle_layer_change(print_obj["layer_num"])

            if (
                self.gcode_state == "FINISH"
                and previous_gcode_state != "FINISH"
                and self.active_model is not None
            ):
                self._handle_print_end()

    def _handle_print_start(self, print_obj):
        logger.info("Print started!")
        model_url = print_obj.get("url")

        self.spent_layers = set()

        if model_url.startswith("http"):
            if print_obj.get("use_ams", False):
                logger.info("Using AMS")
                self.ams_mapping = print_obj.get("ams_mapping", [])
                self.using_ams = True
                logger.info("AMS mapping: {}", self.ams_mapping)
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

            logger.info("Model loaded successfully")

            total_filament_usage = {}

            for layer, layer_usage in self.active_model.items():
                for filament, usage in layer_usage.items():
                    total_filament_usage[filament] = (
                        total_filament_usage.get(filament, 0) + usage
                    )

            for filament, usage in total_filament_usage.items():
                logger.info("Filament {} usage: {}mm", filament, usage)
