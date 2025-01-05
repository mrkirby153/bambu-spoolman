from loguru import logger
from bambu_spoolman.spoolman import new_client
from bambu_spoolman.gcode.bambu import extract_gcode
from bambu_spoolman.gcode.parser import evaluate_gcode
from bambu_spoolman.settings import load_settings
import tempfile
import requests


class FilamentUsageTracker:

    def __init__(self):
        self.spoolman_client = new_client()
        self.active_model = None

    def on_message(self, mqtt_handler, message):
        print_obj = message.get("print", {})
        command = print_obj.get("command")

        if command == "project_file":
            self._handle_print_start(print_obj)

        if command == "push_status":
            if "layer_num" in print_obj:
                self._handle_layer_change(print_obj["layer_num"])

    def _handle_print_start(self, print_obj):
        logger.info("Print started!")

        model_url = print_obj.get("url")

        if model_url.startswith("http"):
            self._load_model(model_url)
            logger.debug("Ams Mapping: {}", print_obj["ams_mapping"])
            self.ams_mapping = print_obj["ams_mapping"]
        else:
            logger.warning("Unsupported model URL: {}", model_url)

    def _handle_layer_change(self, layer):
        if self.active_model is None:
            return
        logger.debug("Layer changed to layer {}", layer)

    def _handle_print_end(self):
        logger.info("Print ended!")
        self.active_model = None

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

            # Load the filament from the configuration
            spoolman_spool = trays.get(str(filament))
            if spoolman_spool is None:
                logger.error("Failed to find tray for filament {}", filament)
                continue

            # Spend the filament
            self.spoolman_client.consume_spool(spoolman_spool, length=usage)

    def _load_model(self, model_url):
        logger.debug("Loading model from URL: {}", model_url)

        with tempfile.NamedTemporaryFile(suffix=".3mf") as model_file:
            temp_file_name = model_file.name
            response = requests.get(model_url)

            if response.status_code != 200:
                logger.error("Failed to download model: {}", response.status_code)
                return
            model_file.write(response.content)

            logger.debug("Model downloaded to {}", temp_file_name)

            gcode = extract_gcode(temp_file_name)

            if gcode is None:
                logger.error("Failed to extract gcode from model")
                return

            logger.debug("Gcode extracted from model")
            self.active_model = evaluate_gcode(gcode)
