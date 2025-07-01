import json
import os

EXTERNAL_SPOOL_ID = 255


def get_configuration_path(path):
    configuration_directory = os.environ.get("BAMBU_SPOOLMAN_CONFIG")
    if configuration_directory is None:
        return path
    return os.path.join(configuration_directory, path)


def _settings_file():
    return get_configuration_path("settings.json")


def save_settings(settings):
    with open(_settings_file(), "w") as f:
        json.dump(settings, f)


def load_settings():
    settings_file_path = _settings_file()
    if os.path.exists(settings_file_path):
        with open(settings_file_path) as f:
            data = json.load(f)

            if os.environ.get("SPOOLMAN_SPOOL_FIELD_NAME") is None:
                data["locked_trays"] = []
            return data
    return {"trays": {}, "tray_count": 0}
