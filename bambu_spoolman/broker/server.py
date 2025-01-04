from loguru import logger
import socket
import os
import asyncio
from flask import g
from bambu_spoolman.broker.command import execute_command
import pickle

SOCKET_PATH = "/tmp/bambu_spoolman.sock"
SERVER_BUFFER_SIZE = 8192


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
    request = await loop.sock_recv(client, SERVER_BUFFER_SIZE)
    (command_name, args, kwargs) = pickle.loads(request)
    logger.debug(
        "Received command {} with args {} and kwargs {}", command_name, args, kwargs
    )

    try:
        result = await execute_command(command_name, args, kwargs)
        logger.debug("Command executed successfully with result {}", result)
        response = pickle.dumps(result)
    except Exception as e:
        logger.exception("Error executing command: {}", e, exc_info=True)
        response = pickle.dumps(e)

    if len(response) > SERVER_BUFFER_SIZE:
        logger.error(
            "Response is too large to be sent over the socket. Max size is {} bytes. Got {} bytes",
            SERVER_BUFFER_SIZE,
            len(response),
        )
        await loop.sock_sendall(
            client,
            pickle.dumps(
                ValueError(
                    f"Response too large. Got {len(response)} bytes max is {SERVER_BUFFER_SIZE}"
                )
            ),
        )
    else:
        await loop.sock_sendall(client, response)

    client.close()
    logger.debug("Client closed")


async def run_server():
    # Load commands
    import bambu_spoolman.broker.commands  # noqa

    logger.info("Starting socket server")
    server = init_socket()
    server.setblocking(False)

    loop = asyncio.get_event_loop()
    while True:
        client, addr = await loop.sock_accept(server)
        loop.create_task(handle_client(client))


def get_socket():
    if "bb_socket" not in g:
        g.bb_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        g.bb_socket.connect(SOCKET_PATH)
    return g.bb_socket
