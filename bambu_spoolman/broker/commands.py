from loguru import logger
from functools import wraps
import pickle
import asyncio

_REGISTERED_COMMANDS = {}


class CommandExecution:

    def __init__(self, name, args, kwargs):
        self.command_name = name
        self.args = args
        self.kwargs = kwargs

    def execute(self):
        from bambu_spoolman.broker.server import get_socket

        logger.debug(
            "Executing command with args: {} and kwargs: {}", self.args, self.kwargs
        )
        socket = get_socket()
        # Pickle args and kwargs
        data = pickle.dumps((self.command_name, self.args, self.kwargs))
        socket.sendall(data)

        response_bytes = socket.recv(2048)
        response = pickle.loads(response_bytes)
        return response


async def execute_command(command_name, args, kwargs):
    command = _REGISTERED_COMMANDS.get(command_name)
    if command is None:
        raise ValueError(f"Command {command_name} not found")

    if asyncio.iscoroutinefunction(command):
        return await command(*args, **kwargs)
    else:
        return command(*args, **kwargs)


def command(func):
    name = func.__name__
    logger.debug("Registering server command: {}", name)
    _REGISTERED_COMMANDS[name] = func

    @wraps(func)
    def wrapper(*args, **kwargs):
        return CommandExecution(name, args, kwargs)

    return wrapper


@command
async def testing(first, second):
    return first + second
