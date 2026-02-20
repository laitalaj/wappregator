import asyncio
import time
import logging

import valkey.asyncio as valkey
from wapprecommon import listeners

DEAD_BACKEND_CHECK_INTERVAL_SECONDS = 120
BACKEND_DEAD_THRESHOLD_SECONDS = 60

logger = logging.getLogger(__name__)


async def cleanup_dead_backends(pool: valkey.ConnectionPool) -> None:
    """Periodically check for and clean up dead backends.

    This should be run as a background task by the pollers to ensure that
    backend-specific cache entries (e.g. radio listeners) for backends that have
    stopped sending heartbeats are removed from Valkey.

    Usually the backend teardown will handle this, but in case of a truly catastrophic
    failure this might not happen.

    Args:
        pool: The Valkey connection pool to use for the operation.
    """
    async with valkey.Valkey(connection_pool=pool) as client:
        while True:
            hbs = await listeners.get_backend_heartbeats(client)
            now = int(time.time())
            dead_backends = [
                backend_id
                for backend_id, hb in hbs.items()
                if now - hb > BACKEND_DEAD_THRESHOLD_SECONDS
            ]
            for backend_id in dead_backends:
                logger.warning(
                    "Cleaning up cache entries for dead backend %s", backend_id
                )
                await listeners.cleanup_backend(client, backend_id)
            await asyncio.sleep(DEAD_BACKEND_CHECK_INTERVAL_SECONDS)
