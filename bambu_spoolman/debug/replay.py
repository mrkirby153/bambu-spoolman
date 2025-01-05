import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import os
import ssl
import datetime
import time
from loguru import logger
import json

REPLAY_FILE = "messages.log"


def parse_log_line(line):
    timestamp, message = line.split("]: ")
    message = message.strip()

    return datetime.datetime.strptime(timestamp[1:], "%Y-%m-%dT%H:%M:%S.%f"), eval(
        message
    )


def main():
    load_dotenv()
    client = mqtt.Client()
    client.username_pw_set("bblp", os.environ.get("PRINTER_ACCESS_CODE"))

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    client.tls_set_context(ssl_ctx)
    client.tls_insecure_set(True)

    client.connect(os.environ.get("PRINTER_IP"), 8883, keepalive=5)

    client.loop_start()

    log_lines = []
    with open(REPLAY_FILE, "r") as f:
        log_lines = list(map(parse_log_line, f.readlines()))

    logger.info(f"Read {len(log_lines)} lines from log file")

    for i in range(len(log_lines)):
        timestamp, message = log_lines[i]

        to_publish = json.dumps(message)
        topic = f"device/{os.environ.get('PRINTER_SERIAL')}/report"
        logger.info(f"Publishing message {to_publish}: {topic}")

        client.publish(topic, to_publish).wait_for_publish()

        if i < len(log_lines) - 1:
            next_timestamp = log_lines[i + 1][0]
            delta = (next_timestamp - timestamp) / 2
            logger.info(f"Sleeping for {delta.total_seconds()} seconds")
            time.sleep(delta.total_seconds())
    client.loop_stop()
    client.disconnect()
