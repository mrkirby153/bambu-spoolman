import json
import os


def save_settings(settings):
    with open("settings.json", "w") as f:
        json.dump(settings, f)


def load_settings():
    if os.path.exists("settings.json"):
        with open("settings.json") as f:
            return json.load(f)
    return {}
