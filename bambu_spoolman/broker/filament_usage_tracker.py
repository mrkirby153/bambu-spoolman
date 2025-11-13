import os
import tempfile
from urllib.parse import urlparse

import requests
from loguru import logger

from bambu_spoolman.bambu_ftp import retrieve_3mf
from bambu_spoolman.broker.checkpoint import (
    clear as clear_checkpoint,
)
from bambu_spoolman.broker.checkpoint import (
    recover_model,
    save_checkpoint,
    update_layer,
)
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
        self.current_layer = None

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
                last_layer = self.current_layer
                layer = print_obj["layer_num"]
                if layer != last_layer:
                    logger.debug("Layer changed to layer {}", layer)
                    self._handle_layer_change(layer)
                    self.current_layer = layer

            if (
                self.gcode_state == "FINISH"
                and previous_gcode_state != "FINISH"
                and self.active_model is not None
            ):
                self._handle_print_end()

            if (
                self.gcode_state == "RUNNING"
                and previous_gcode_state != "RUNNING"
                and self.active_model is None
            ):
                # The print is in progress, but we don't have a model loaded.
                # Check if we saved the model when the print was started and attempt to
                # load it.
                task_id = print_obj.get("task_id")
                subtask_id = print_obj.get("subtask_id")
                self._attempt_print_resume(task_id, subtask_id)

    def _handle_print_start(self, print_obj):
        logger.info("Print started!")
        clear_checkpoint()
        model_url = print_obj.get("url")

        self.spent_layers = set()

        model = self._retrieve_model(model_url)
        if model is None:
            logger.error("Failed to retrieve model. Print will not be tracked")
            return

        if print_obj.get("use_ams", False):
            logger.info("Using AMS")
            self.ams_mapping = print_obj.get("ams_mapping", [])
            self.using_ams = True
            logger.info("AMS mapping: {}", self.ams_mapping)
        else:
            logger.info("Not using AMS")
            self.using_ams = False

        gcode_file_name = print_obj.get("param")

        self._load_model(model, gcode_file_name)

        save_checkpoint(
            model_path=model,
            current_layer=0,
            task_id=print_obj.get("task_id"),
            subtask_id=print_obj.get("subtask_id"),
            ams_mapping=self.ams_mapping,
            gcode_file_name=gcode_file_name,
        )

        # Delete the downloaded model
        os.remove(model)

        # Spend layer 0 filament
        self._handle_layer_change(0)

    def _retrieve_model(self, model_url):
        logger.debug("Loading model from URL: {}", model_url)

        ftp_uris = (
            "file",
            "ftp",
            "brtc"
        )

        # Turn URL into a URI
        uri = urlparse(model_url)

        if uri.scheme == "https" or uri.scheme == "http":
            return self._download_model(model_url)
        elif uri.scheme in ftp_uris:
            path = f"{uri.netloc}{uri.path}"
            return self._retrieve_model_from_ftp(path)
        else:
            logger.warning("Unsupported model URL: {}", model_url)
            return None

    def _handle_layer_change(self, layer):
        if self.active_model is None:
            logger.debug("Skipping layer change because no model is loaded")
            return
        if layer in self.spent_layers:
            logger.debug(
                "Skipping layer change because layer {} is already spent", layer
            )
            return  # Already spent this layer. Probably a full report

        self.spent_layers.add(layer)

        last_layer = self.current_layer

        if last_layer:
            # Spend layers between the last layer and the current layer
            logger.debug("Last layer: {}", last_layer)
            logger.debug("Current layer: {}", layer)
            to_spend = set(range(last_layer + 1, layer + 1))
            logger.debug("Spending layers: {}", to_spend)
            for i in to_spend:
                self._spend_filament_for_layer(i)
        update_layer(layer)

    def _handle_print_end(self):
        logger.info("Print ended!")

        # Spend all layers that haven't already been spent
        for layer in set(self.active_model.keys()) - self.spent_layers:
            logger.debug(f"Spending layer {layer} as it was not spent during the print")
            self._handle_layer_change(layer)

        self.active_model = None
        self.ams_mapping = None
        self.using_ams = False
        self.current_layer = None

        clear_checkpoint()

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

    def _download_model(self, model_url):
        logger.debug("Downloading model from URL: {}", model_url)

        with tempfile.NamedTemporaryFile(suffix=".3mf", delete=False) as model_file:
            temp_file_name = model_file.name
            response = requests.get(model_url)

            if response.status_code != 200:
                logger.error("Failed to download model: {}", response.status_code)
                return
            model_file.write(response.content)

            logger.debug("Model downloaded to {}", temp_file_name)
            return temp_file_name

    def _retrieve_model_from_ftp(self, model_path):
        logger.debug("Retrieving model from FTP path: {}", model_path)

        mount_prefixes = (
            "/sdcard/",
            "/media/usb0/"
        )

        # Remove fs mount prefixes
        for p in mount_prefixes:
            if model_path.startswith(p):
                model_path = model_path.removeprefix(p)
                break

        # Retrieve from FTP server
        return retrieve_3mf(model_path)

    def _load_model(self, model_path, gcode_file):
        gcode = extract_gcode(model_path, gcode_file)

        if gcode is None:
            logger.error("Failed to extract gcode from model")
            return
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

    def _attempt_print_resume(self, task_id, subtask_id):
        result = recover_model(task_id, subtask_id)
        if result is None:
            return
        model_path, gcode_file_name, current_layer, ams_mapping = result

        logger.info("Recovered model from checkpoint")

        self._load_model(model_path, gcode_file_name)
        self.spent_layers = set(range(current_layer + 1))
        self.ams_mapping = ams_mapping
        self.current_layer = current_layer
        self.using_ams = ams_mapping is not None
