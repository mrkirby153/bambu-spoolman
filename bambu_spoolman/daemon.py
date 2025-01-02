import asyncio
from bambu_spoolman.broker.server import run_server


async def async_main():
    loop = asyncio.get_event_loop()
    tasks = []
    tasks.append(loop.create_task(run_server()))
    await asyncio.gather(*tasks)


def main():
    asyncio.run(async_main())
