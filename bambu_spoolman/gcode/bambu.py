import zipfile
import tempfile
from loguru import logger
import os
import xml.etree.ElementTree as ET
import shutil


def extract_gcode(path, gcode_path=None):
    logger.debug(f"Extracting GCODE from {path}")
    with tempfile.TemporaryDirectory() as temp_folder:
        logger.debug("Extracting {} to {}", path, temp_folder)
        with zipfile.ZipFile(path, "r") as zip_ref:
            zip_ref.extractall(temp_folder)

        # Find the GCODE file

        if gcode_path is None:
            model_settings_path = os.path.join(
                temp_folder, "Metadata", "model_settings.config"
            )
            logger.debug(f"Looking for GCODE in {model_settings_path}")

            root = ET.parse(model_settings_path).getroot()
            plate = root[0]
            for item in plate:
                if item.attrib["key"] == "gcode_file":
                    gcode_path = os.path.join(temp_folder, item.attrib["value"])
                    break

            if gcode_path is None:
                logger.error("Could not find GCODE file")
                return
        else:
            gcode_path = os.path.join(temp_folder, gcode_path)

        logger.debug(f"Found GCODE file at {gcode_path}")
        with open(gcode_path, "r") as f:
            gcode = f.read()
            logger.debug(f"Read {len(gcode)} bytes of GCODE")
            # Delete the temp folder
            shutil.rmtree(temp_folder)
            return gcode
