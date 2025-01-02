from loguru import logger
import socket
import os
import asyncio
from flask import g
from bambu_spoolman.broker.commands import execute_command
import pickle

SOCKET_PATH = "/tmp/bambu_spoolman.sock"


def init_socket():
    logger.debug("Initializing socket at {}", SOCKET_PATH)
    if os.path.exists(SOCKET_PATH):
        logger.debug("Removing existing socket")
        os.unlink(SOCKET_PATH)
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.bind(SOCKET_PATH)
    server.listen(1)

    return server


async def handle_client(client):
    loop = asyncio.get_event_loop()
    request = await loop.sock_recv(client, 255)
    (command_name, args, kwargs) = pickle.loads(request)
    logger.debug(
        "Received command {} with args {} and kwargs {}", command_name, args, kwargs
    )

    try:
        result = await execute_command(command_name, args, kwargs)
        response = pickle.dumps(result)
    except Exception as e:
        logger.error("Error executing command: {}", e)
        response = pickle.dumps(e)

    await loop.sock_sendall(client, response)

    client.close()
    logger.debug("Client closed")


async def run_server():
    logger.info("Starting socket server")
    server = init_socket()
    server.setblocking(False)

    loop = asyncio.get_event_loop()
    while True:
        client, addr = await loop.sock_accept(server)
        logger.debug("Accepted connection from:", addr)
        loop.create_task(handle_client(client))


def get_socket():
    if "bb_socket" not in g:
        g.bb_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        g.bb_socket.connect(SOCKET_PATH)
    return g.bb_socket
