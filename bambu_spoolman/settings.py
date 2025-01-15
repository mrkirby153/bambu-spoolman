import json
import os

EXTERNAL_SPOOL_ID = 255


def _settings_file():
    configuration_directory = os.environ.get("BAMBU_SPOOLMAN_CONFIG")
    if configuration_directory is None:
        return "settings.json"
    return os.path.join(configuration_directory, "settings.json")


def save_settings(settings):
    with open(_settings_file(), "w") as f:
        json.dump(settings, f)


def load_settings():
    settings_file_path = _settings_file()
    if os.path.exists(settings_file_path):
        with open(settings_file_path) as f:
            return json.load(f)
    return {}
