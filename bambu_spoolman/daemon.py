import asyncio
from bambu_spoolman.broker.server import run_server
from bambu_spoolman.bambu_mqtt import MqttHandler, stateful_printer_info
from dotenv import load_dotenv
import os


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

    mqtt.start()

    await asyncio.gather(*tasks)
    # mqtt.join()


def main():
    load_dotenv()
    asyncio.run(async_main())