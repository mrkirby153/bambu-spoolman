import asyncio
import datetime
import os
import time

from dotenv import load_dotenv
from loguru import logger

from bambu_spoolman.bambu_mqtt import MqttHandler, stateful_printer_info
from bambu_spoolman.broker.automatic_spool_switch import AutomaticSpoolSwitch
from bambu_spoolman.broker.filament_usage_tracker import FilamentUsageTracker
from bambu_spoolman.broker.server import run_server
from bambu_spoolman.spoolman import new_client

async def async_main():
    loop = asyncio.get_event_loop()
    tasks = []
    tasks.append(loop.create_task(run_server()))
    mqtt = MqttHandler(
        os.environ.get("PRINTER_IP"),
        os.environ.get("PRINTER_SERIAL"),
        os.environ.get("PRINTER_ACCESS_CODE"),
    )

    stateful_printer_info.mqtt_handler = mqtt

    mqtt.add_callback(stateful_printer_info.handle_message)
    mqtt.add_on_connect_callback(stateful_printer_info.on_connect)
    mqtt.add_on_disconnect_callback(stateful_printer_info.on_disconnect)

    usage_tracker = FilamentUsageTracker()
    mqtt.add_callback(usage_tracker.on_message)

    if os.environ.get("SPOOLMAN_SPOOL_FIELD_NAME") is not None:
        logger.info("Enabling automatic spool switching")
        mqtt.add_callback(AutomaticSpoolSwitch.get_instance().on_message)

    mqtt.start()

    await asyncio.gather(*tasks)
    mqtt.join()


def main():
    load_dotenv()
    asyncio.run(async_main())


def testing():
    load_dotenv()

    mqtt = MqttHandler(
        os.environ.get("PRINTER_IP"),
        os.environ.get("PRINTER_SERIAL"),
        os.environ.get("PRINTER_ACCESS_CODE"),
    )

    stateful_printer_info.mqtt_handler = mqtt

    mqtt.add_callback(stateful_printer_info.handle_message)

    file = open("messages.log", "w")

    def handle_message(mqtt_handler, message):
        ts = datetime.datetime.now().isoformat()
        file.write(f"[{ts}]: {message}\n")
        file.flush()

    mqtt.add_callback(handle_message)

    mqtt.start()
    mqtt.join()
