from flask import Blueprint, g, request
import os
import json

blueprint = Blueprint("bambu_spoolman", __name__, url_prefix="/api")


@blueprint.route("/")
def index():
    return {
        "status": "ok",
        "spoolman_url": g.spoolman.endpoint,
        "spoolman_valid": g.spoolman.validate(),
    }


@blueprint.route("/spools")
def spools():
    return g.spoolman.get_spools()


@blueprint.route("/spool/<spool_id>")
def spool(spool_id):
    return g.spoolman.get_spool(spool_id)


@blueprint.route("/settings", methods=["GET"])
def get_settings():
    if os.path.exists("settings.json"):
        with open("settings.json") as f:
            return json.load(f)
    return {}


@blueprint.route("/settings", methods=["POST"])
def save_settings():
    with open("settings.json", "w") as f:
        json.dump(request.json, f)
    return {"status": "ok"}
