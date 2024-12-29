from loguru import logger
from bambu_spoolman.gcode.parser import evaluate_gcode
from bambu_spoolman.gcode.bambu import extract_gcode


def main():
    logger.info("Testing")
    gcode = extract_gcode("test.3mf")
    layer_usage = evaluate_gcode(gcode)

    logger.info(f"Found {len(layer_usage)} layers")

    total_usage = {}
    for usage in layer_usage.values():
        for filament_id, amount in usage.items():
            total_usage[filament_id] = total_usage.get(filament_id, 0) + amount

    logger.info("Total usage (mm):")
    for filament_id, amount in total_usage.items():
        logger.info(f"Filament {filament_id}: {amount}")
