import asyncio
import pathlib
import time

import valkey.asyncio as valkey

HEARTBEAT_PATH = pathlib.Path("/tmp/heartbeat")
READY_PATH = pathlib.Path("/tmp/ready")
HEARTBEAT_PERIOD_SECONDS = 10
READY_PERIOD_SECONDS = 10


async def heartbeat() -> None:
    """Write the current Unix timestamp to the heartbeat file periodically."""
    while True:
        HEARTBEAT_PATH.write_text(str(int(time.time())))
        await asyncio.sleep(HEARTBEAT_PERIOD_SECONDS)


async def ready(connection_pool: valkey.ConnectionPool) -> None:
    """Touch the ready file on successful valkey ping, delete it on failure."""
    while True:
        try:
            async with valkey.Valkey(connection_pool=connection_pool) as client:
                await client.ping()
                READY_PATH.touch()
        except Exception:
            READY_PATH.unlink(missing_ok=True)
        await asyncio.sleep(READY_PERIOD_SECONDS)
