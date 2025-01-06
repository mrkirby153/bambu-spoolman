import re

from loguru import logger


class GCodeOperation:
    def __init__(self, raw_line):
        self.operation = None
        self.params = {}
        self.comment = None

        self._parse(raw_line)

    def _parse(self, raw_line):
        # Split the line into operation and comment
        parts = list(map(lambda x: x.strip(), raw_line.split(";")))
        if len(parts) > 1:
            self.comment = parts[1].strip()

        # Split the operation into parts
        parts = re.split(r"\s+", parts[0])
        self.operation = parts[0]
        for part in parts[1:]:
            key = part[0]
            value = part[1:]
            self.params[key] = value

    def __repr__(self):
        return f"<GCodeOperation {self.operation} {self.params} {self.comment}>"


def parse_gcode(gcode):
    operations = []
    for line in gcode.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith(";"):
            continue

        # logger.debug(f"Parsing line: {line}")
        operation = GCodeOperation(line)
        operations.append(operation)

    return operations


def evaluate_gcode(gcode):
    """
    Evaluate the gcode and return the filament usage (in mm) per layer
    """
    operations = parse_gcode(gcode)
    logger.info(f"Found {len(operations)} operations")

    current_layer = 0  # The current layer
    current_extrusion = {}  # Running total of extrusion per filament on this layer
    active_filament = None  # The currently active filament

    layer_filaments = {}  # Filament usage per layer

    for operation in operations:
        if operation.operation == "M73":  # Layer change
            if layer := operation.params.get("L"):
                next_layer = int(layer)
                logger.debug(f"Layer change: {current_layer} -> {next_layer}")

                if current_extrusion:
                    # Layer change, record the filament usage
                    layer_filaments[current_layer] = current_extrusion.copy()
                    current_extrusion = {}

                current_layer = next_layer

        if operation.operation == "M620":  # Tool change
            if filament := operation.params.get("S"):
                if filament == "255":
                    logger.debug("Full unload")
                    active_filament = None
                    continue
                filament = int(filament[:-1])
                logger.debug(f"Filament change from {active_filament} to {filament}")
                active_filament = filament

        if operation.operation in ["G0", "G1", "G2", "G3"]:  # Extrusion
            if extrusion := operation.params.get("E"):
                extrusion_amount = float(extrusion)
                if active_filament is None:
                    logger.error("No active filament")
                    continue

                current_extruded = current_extrusion.get(active_filament, 0)
                current_extrusion[active_filament] = current_extruded + extrusion_amount
    # Finished
    if current_extrusion:
        layer_filaments[current_layer] = current_extrusion.copy()
    return layer_filaments
