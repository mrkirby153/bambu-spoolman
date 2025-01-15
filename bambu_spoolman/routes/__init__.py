from flask import Blueprint, g, request

from bambu_spoolman.broker.commands import get_printer_status, get_tray_count, testing
from bambu_spoolman.settings import load_settings, save_settings

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


@blueprint.route("/printer-info/trays")
def get_ams_trays():
    trays = get_tray_count().execute()
    return {"trays": trays}


@blueprint.route("/tray/<tray_id>", methods=["POST"])
def update_tray(tray_id):
    data = request.json
    if "spool_id" not in data:
        return {"status": "error", "message": "Missing 'spool_id'"}, 400

    settings = load_settings()
    trays = settings.get("trays", {})
    spool_id = data.get("spool_id")
    if spool_id is None:
        if tray_id in trays:
            del trays[tray_id]
            settings["trays"] = trays
    else:
        spool_id = int(spool_id)
        spool = g.spoolman.get_spool(spool_id)
        if spool is None:
            return {"status": "error", "message": "Spool not found"}, 404

        if spool_id in trays.values():
            if trays.get(tray_id, None) != spool_id:
                return {
                    "status": "error",
                    "message": "Tray already assigned to another spool",
                }, 400

        trays[tray_id] = spool_id
    settings["trays"] = trays
    save_settings(settings)

    return {"status": "ok"}


@blueprint.route("/printer-info")
def printer_info():
    (status, last_update, connected) = get_printer_status().execute()
    return {"status": status, "last_update": last_update, "connected": connected}


@blueprint.route("/daemon-test/<one>/<two>")
def daemon_test(one, two):
    return testing(int(one), int(two)).execute()
