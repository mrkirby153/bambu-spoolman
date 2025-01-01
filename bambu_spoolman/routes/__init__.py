from flask import Blueprint, g, request
from bambu_spoolman.settings import save_settings, load_settings

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
    spool = g.spoolman.get_spool(spool_id)
    if spool is None:
        return {"status": "error", "message": "Spool not found"}, 404
    return spool


@blueprint.route("/settings", methods=["GET"])
def get_settings():
    return load_settings()


@blueprint.route("/settings", methods=["POST"])
def save_settings_route():
    save_settings(request.json)
    return {"status": "ok"}


@blueprint.route("/tray/<tray_id>", methods=["POST"])
def update_tray(tray_id):
    data = request.json
    if "spool_id" not in data:
        return {"status": "error", "message": "Missing 'spool_id'"}, 400

    spool_id = int(data["spool_id"])
    spool = g.spoolman.get_spool(spool_id)
    if spool is None:
        return {"status": "error", "message": "Spool not found"}, 404

    settings = load_settings()
    trays = settings["trays"] or {}
    if spool_id in trays.values():
        if trays[tray_id] != spool_id:
            return {
                "status": "error",
                "message": "Tray already assigned to another spool",
            }, 400

    trays[tray_id] = spool_id
    settings["trays"] = trays
    save_settings(settings)

    return {"status": "ok"}
