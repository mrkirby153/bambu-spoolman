from loguru import logger
import paho.mqtt.client as mqtt
import ssl
from typing import Callable
import json
import threading
import time


def recursive_merge(dict1, dict2):
    for key, value in dict2.items():
        if key in dict1 and isinstance(value, dict):
            recursive_merge(dict1[key], value)
        else:
            dict1[key] = value


class StatefulPrinterInfo:

    def __init__(self):
        self._info = {}
        self.mqtt_handler = None
        self.last_update = 0
        self.connected = False

    def handle_message(self, mqtt_handler, message):
        if "print" not in message:
            return

        print_status = message["print"]
        if "command" not in print_status or print_status["command"] != "push_status":
            logger.debug("Ignoring message: {}", message)
            return  # Not a status message
        # Merge the new info with the old info
        recursive_merge(self._info, message)
        self.last_update = int(time.time())

    def on_connect(self, mqtt_handler):
        logger.info("Connected to printer")
        self.solicit()
        self.connected = True

    def on_disconnect(self, mqtt_handler):
        self.connected = False

    def solicit(self):
        logger.debug("Soliciting printer info")
        self.mqtt_handler.publish(
            {"pushing": {"sequence_id": "0", "command": "pushall"}}
        )

    def get_info(self):
        return self._info


stateful_printer_info = StatefulPrinterInfo()


class MqttHandler(threading.Thread):

    def __init__(self, printer_ip, printer_serial, printer_access_code):
        self.printer_ip = printer_ip
        self.printer_serial = printer_serial
        self.printer_access_code = printer_access_code
        self.connected = False
        self.pending_messages = []

        self.client = self._create_client()
        self.callbacks = {"on_connect": [], "on_message": [], "on_disconnect": []}

        super().__init__()
        self.daemon = True
        self.setName(f"MqttHandler-{printer_serial}")

    def run(self):
        last_error = None
        while True:
            try:
                self.client.connect(self.printer_ip, 8883, keepalive=5)
                self.client.loop_forever(retry_first_connection=True)
            except TimeoutError:
                if last_error != "TimeoutError":
                    logger.warning(
                        f"Connection to printer {self.printer_serial} timed out"
                    )
                last_error = "TimeoutError"
                time.sleep(5)
            except ConnectionError:
                if last_error != "ConnectionError":
                    logger.warning(
                        f"Connection to printer {self.printer_serial} failed"
                    )
                last_error = "ConnectionError"
                time.sleep(5)
            except OSError as e:
                if e.errno == 113:
                    if last_error != "oserror113":
                        logger.warning(
                            f"Connection to printer {self.printer_serial} failed: No route to host"
                        )
                    last_error = "oserror113"
                    time.sleep(5)
                else:
                    logger.error(f"Error occurred in MQTT loop: {e}")
                    time.sleep(1)
            except Exception as e:
                logger.exception(f"Error occurred in MQTT loop: {e}")
                time.sleep(1)

    def add_callback(self, callback: Callable[["MqttHandler", dict], None]):
        self.callbacks["on_message"].append(callback)

    def add_on_connect_callback(self, callback: Callable[["MqttHandler"], None]):
        self.callbacks["on_connect"].append(callback)

    def add_on_disconnect_callback(self, callback: Callable[["MqttHandler"], None]):
        self.callbacks["on_disconnect"].append(callback)

    def _on_connect(self, client, userdata, flags, rc):
        logger.info(f"Connected to printer {self.printer_serial} with result code {rc}")
        self.connected = True
        self._subscribe()

        for callback in self.callbacks["on_connect"]:
            callback(self)

        logger.debug(f"Pending messages: {self.pending_messages}")
        for message in self.pending_messages:
            self.publish(message)
        self.pending_messages = []

    def _on_message(self, client, userdata, msg):
        logger.debug(
            f"Received message on topic {msg.topic} with payload {msg.payload}"
        )
        for callback in self.callbacks["on_message"]:
            callback(self, json.loads(msg.payload))

    def _on_disconnect(self, client, userdata, rc):
        logger.info(
            f"Disconnected from printer {self.printer_serial} with result code {rc}"
        )
        self.connected = False
        for callback in self.callbacks["on_disconnect"]:
            callback(self)

    def publish(self, message, wait=False):
        if not self.connected:
            self.pending_messages.append(message)
            return

        if isinstance(message, dict):
            message = json.dumps(message)
        result = self.client.publish(f"device/{self.printer_serial}/request", message)
        if wait:
            result.wait_for_publish()
        return

    def _create_client(self):
        client = mqtt.Client()
        client.username_pw_set("bblp", self.printer_access_code)
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        client.tls_set_context(ssl_ctx)
        client.tls_insecure_set(True)

        client.on_connect = self._on_connect
        client.on_message = self._on_message
        client.on_disconnect = self._on_disconnect

        return client

    def _subscribe(self):
        self.client.subscribe(f"device/{self.printer_serial}/report")