import zipfile
import tempfile
from loguru import logger
import os
import xml.etree.ElementTree as ET
import shutil


def _extract_zip(zip_path):
    # Extract to a temp folder
    temp_folder = tempfile.mkdtemp()
    logger.debug(f"Extracting {zip_path} to {temp_folder}")
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(temp_folder)
    return temp_folder


def extract_gcode(path):
    logger.debug(f"Extracting GCODE from {path}")

    # Extract the 3MF file
    temp_folder = _extract_zip(path)

    # Find the GCODE file
    gcode_path = None

    model_settings_path = os.path.join(temp_folder, "Metadata", "model_settings.config")
    logger.debug(f"Looking for GCODE in {model_settings_path}")

    root = ET.parse(model_settings_path).getroot()
    plate = root[0]
    for item in plate:
        if item.attrib["key"] == "gcode_file":
            gcode_path = os.path.join(temp_folder, item.attrib["value"])
            break

    if gcode_path is None:
        logger.error("Could not find GCODE file")

        shutil.rmtree(temp_folder)
        return

    logger.debug(f"Found GCODE file at {gcode_path}")
    with open(gcode_path, "r") as f:
        gcode = f.read()
        logger.debug(f"Read {len(gcode)} bytes of GCODE")
        # Delete the temp folder
        shutil.rmtree(temp_folder)
        return gcode
