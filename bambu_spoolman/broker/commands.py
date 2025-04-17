from bambu_spoolman.bambu_mqtt import stateful_printer_info
from bambu_spoolman.broker.automatic_spool_switch import AutomaticSpoolSwitch
from bambu_spoolman.broker.command import command
from bambu_spoolman.settings import load_settings


@command
async def testing(first: int, second: int):
    return first / second


@command
def get_printer_status():
    return (
        stateful_printer_info.get_info(),
        stateful_printer_info.last_update,
        stateful_printer_info.connected,
    )


@command
def get_tray_count():
    if stateful_printer_info.connected:
        if ams := stateful_printer_info.get_info().get("print", {}).get("ams"):
            return len(ams.get("ams", [])) * 4
        else:
            return load_settings().get("tray_count", 0)
    else:
        return load_settings().get("tray_count", 0)

@command
def resync_trays():
    AutomaticSpoolSwitch.get_instance().sync()