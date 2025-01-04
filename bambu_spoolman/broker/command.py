from loguru import logger
from functools import wraps
import pickle
import asyncio
from typing import Callable, TypeVar, ParamSpec, Coroutine, Any, overload

_REGISTERED_COMMANDS = {}

T = TypeVar("T")
P = ParamSpec("P")
R = TypeVar("R")


class CommandExecution[R]:

    def __init__(self, name, args, kwargs):
        self.command_name = name
        self.args = args
        self.kwargs = kwargs

    def execute(self) -> R:
        from bambu_spoolman.broker.server import get_socket, SERVER_BUFFER_SIZE

        logger.debug(
            "Executing command with args: {} and kwargs: {}", self.args, self.kwargs
        )
        socket = get_socket()
        # Pickle args and kwargs
        data = pickle.dumps((self.command_name, self.args, self.kwargs))

        if len(data) > SERVER_BUFFER_SIZE:
            raise ValueError(
                f"Arguments are too large to be sent over the socket. Max size is {SERVER_BUFFER_SIZE} bytes. Got {len(data)} bytes"
            )
        socket.sendall(data)

        response_bytes = socket.recv(SERVER_BUFFER_SIZE)
        response = pickle.loads(response_bytes)

        if response is not None and isinstance(response, Exception):
            raise response
        return response


async def execute_command(command_name, args, kwargs):
    command = _REGISTERED_COMMANDS.get(command_name)
    if command is None:
        raise ValueError(f"Command {command_name} not found")

    if asyncio.iscoroutinefunction(command):
        return await command(*args, **kwargs)
    else:
        return command(*args, **kwargs)


@overload
def command(
    func: Callable[P, Coroutine[Any, Any, R]]
) -> Callable[P, CommandExecution[R]]: ...


def command(func: Callable[P, R]) -> Callable[P, CommandExecution[R]]:
    name = func.__name__
    logger.debug("Registering server command: {}", name)
    _REGISTERED_COMMANDS[name] = func

    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> CommandExecution[R]:
        return CommandExecution(name, args, kwargs)

    return wrapper
