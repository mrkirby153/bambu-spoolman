from bambu_spoolman.broker.command import command
from bambu_spoolman.bambu_mqtt import stateful_printer_info


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
