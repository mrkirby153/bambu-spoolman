import json
import os
import shutil

from loguru import logger

from bambu_spoolman.settings import get_configuration_path


def checkpoint_directory():
    path = get_configuration_path("checkpoint")
    if not os.path.exists(path):
        os.makedirs(path)
    return path


def get_checkpoint_metadata():
    metadata_path = os.path.join(checkpoint_directory(), "metadata.json")

    if not os.path.exists(metadata_path):
        return {}
    with open(metadata_path) as f:
        return json.load(f)


def _save_checkpoint_metadata(metadata):
    with open(os.path.join(checkpoint_directory(), "metadata.json"), "w") as f:
        json.dump(metadata, f)


def save_checkpoint(
    *, model_path, current_layer, task_id, subtask_id, ams_mapping, gcode_file_name
):
    shutil.copy(model_path, os.path.join(checkpoint_directory(), "model.3mf"))

    existing_metadata = get_checkpoint_metadata()
    existing_metadata["task_id"] = task_id
    existing_metadata["subtask_id"] = subtask_id
    existing_metadata["current_layer"] = current_layer
    existing_metadata["ams_mapping"] = ams_mapping
    existing_metadata["gcode_file_name"] = gcode_file_name
    _save_checkpoint_metadata(existing_metadata)


def clear():
    if os.path.exists(checkpoint_directory()):
        logger.debug("Clearing checkpoint")
        shutil.rmtree(checkpoint_directory())


def update_layer(layer):
    metadata = get_checkpoint_metadata()
    metadata["current_layer"] = layer
    _save_checkpoint_metadata(metadata)


def recover_model(task_id, subtask_id):
    logger.info("Attempting to recover task {} subtask {}", task_id, subtask_id)
    metadata = get_checkpoint_metadata()

    checkpoint_task_id = metadata.get("task_id")
    checkpoint_subtask_id = metadata.get("subtask_id")

    if checkpoint_task_id is None or checkpoint_subtask_id is None:
        logger.error("No checkpoint saved.", task_id)
        return None

    if checkpoint_task_id != task_id or checkpoint_subtask_id != subtask_id:
        logger.error(
            "Recovered task does not match current task. Expected task id {} and subtask id {}, got task id {} and subtask id {}",
            checkpoint_task_id,
            checkpoint_subtask_id,
            task_id,
            subtask_id,
        )
        return None
    # Checkpoint is valid, load the model

    model_path = os.path.join(checkpoint_directory(), "model.3mf")

    if not os.path.exists(model_path):
        logger.error("Model file does not exist")
        return None

    current_layer = metadata.get("current_layer")
    ams_mapping = metadata.get("ams_mapping")
    gcode_file_name = metadata.get("gcode_file_name")

    if current_layer is None or gcode_file_name is None:
        logger.error("Checkpoint metadata is incomplete")
        return None

    return model_path, gcode_file_name, current_layer, ams_mapping
