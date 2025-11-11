from flask import Blueprint, g, request

from bambu_spoolman.broker.commands import (
    get_printer_status,
    get_tray_count,
    resync_trays,
    testing,
)
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

    locked_trays = settings.get("locked_trays", [])
    print(f"Locked trays: {locked_trays}")
    if int(tray_id) in locked_trays:
        return {
            "status": "error",
            "message": "Tray is locked and cannot be changed",
        }, 400

    tray_id_int = int(tray_id)
    spool_id = data.get("spool_id")

    # Get the old spool_id if there was one, so we can clear its tray field
    old_spool_id = trays.get(tray_id)

    if spool_id is None:
        # Clearing the tray assignment
        if tray_id in trays:
            del trays[tray_id]
            settings["trays"] = trays

        # Clear the tray field in Spoolman for the old spool
        if old_spool_id is not None:
            try:
                g.spoolman.set_active_tray(old_spool_id, "")
            except Exception as e:
                print(f"Failed to clear tray field for spool {old_spool_id}: {e}")
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

        # Set the tray field in Spoolman for the new spool
        # Calculate AMS and tray slot (AMS is 0-indexed, tray is 1-indexed)
        ams_id = tray_id_int // 4
        tray_slot_id = (tray_id_int % 4) + 1
        active_tray_id = f"ams_{ams_id}_tray_{tray_slot_id}"

        try:
            g.spoolman.set_active_tray(spool_id, active_tray_id)
        except Exception as e:
            print(f"Failed to set tray field for spool {spool_id}: {e}")

        # Clear the tray field for the old spool if it was different
        if old_spool_id is not None and old_spool_id != spool_id:
            try:
                g.spoolman.set_active_tray(old_spool_id, "")
            except Exception as e:
                print(f"Failed to clear tray field for old spool {old_spool_id}: {e}")

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


@blueprint.route("/by-uuid/<uuid>")
def tray_lookup(uuid):
    resp = g.spoolman.lookup_by_tray_uuid(uuid)
    if resp is None:
        return {"status": "error", "message": "Not found"}, 404
    return resp


@blueprint.route("/set-uuid/<spool_id>", methods=["POST"])
def tray_update(spool_id):
    data = request.json
    if "tray_uuid" not in data:
        return {"status": "error", "message": "Missing 'tray_uuid'"}, 400
    tray_uuid = data.get("tray_uuid")
    if tray_uuid is None:
        return {"status": "error", "message": "Missing 'tray_uuid'"}, 400

    spool = g.spoolman.get_spool(spool_id)

    print("spool", spool)

    if spool is None:
        return {"status": "error", "message": "Spool not found"}, 404

    success = g.spoolman.set_tray_uuid(spool_id, tray_uuid)

    resync_trays().execute()

    return (
        {"status": "ok"}
        if success
        else {"status": "error", "message": "Failed to set tray uuid"}
    ), (200 if success else 500)
