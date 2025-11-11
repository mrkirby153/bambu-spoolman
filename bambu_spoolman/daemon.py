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


def wait_for_spoolman(max_retries=30, delay=2):
    """
    Wait for Spoolman to be available with exponential backoff
    max_retries: Maximum number of retry attempts (default 30 = ~2 minutes with backoff)
    delay: Initial delay in seconds (default 2)
    """
    spoolman_url = os.environ.get("SPOOLMAN_URL")
    if not spoolman_url:
        logger.warning("SPOOLMAN_URL not set, skipping Spoolman connection check")
        return False

    logger.info("Checking Spoolman connection at {}", spoolman_url)

    retry_count = 0
    backoff_delay = delay
    max_backoff = 60  # Maximum 60 seconds between retries

    while retry_count < max_retries:
        try:
            client = new_client()
            if client.validate():
                logger.info("Successfully connected to Spoolman!")
                return True
            else:
                logger.warning("Spoolman health check failed, retrying...")
        except Exception as e:
            logger.warning("Failed to connect to Spoolman: {} (attempt {}/{})", str(e), retry_count + 1, max_retries)

        retry_count += 1
        if retry_count < max_retries:
            logger.info("Retrying in {} seconds...", backoff_delay)
            time.sleep(backoff_delay)
            # Exponential backoff: 2, 4, 8, 16, 32, 60, 60, ...
            backoff_delay = min(backoff_delay * 2, max_backoff)

    logger.error("Failed to connect to Spoolman after {} attempts", max_retries)
    return False


async def async_main():
    # Wait for Spoolman to be available before starting
    wait_for_spoolman()

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
