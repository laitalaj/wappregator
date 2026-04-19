from typing import Callable, Awaitable
import asyncio
import logging

import valkey.asyncio as valkey

logger = logging.getLogger(__name__)

LOOP_WRAPPER_RESTART_DELAY_SECONDS = 60


async def loop_wrapper(
    type: str,
    id: str,
    loop_func: Callable[[valkey.Valkey], Awaitable[None]],
    connection_pool: valkey.ConnectionPool,
) -> None:
    """Run an infinite poller loop gracefully.

    Handles Valkey connection management and restarts the loop on uncaught exceptions.

    Args:
        type: The type of the poller (for logging).
        id: The ID of the poller (for logging).
        loop_func: The async function to run in the loop.
            Should take a Valkey client as an argument.
        connection_pool: The Valkey connection pool to use.
    """
    while True:
        try:
            async with valkey.Valkey(connection_pool=connection_pool) as valkey_client:
                await loop_func(valkey_client)
        except Exception:
            logger.exception(f"Error in {type} poller loop for {id}")
        finally:
            logger.warning(
                f"{type} poller loop for {id} ended, "
                f"restarting in {LOOP_WRAPPER_RESTART_DELAY_SECONDS} seconds"
            )
            await asyncio.sleep(LOOP_WRAPPER_RESTART_DELAY_SECONDS)


async def store_and_publish(
    valkey_client: valkey.Valkey,
    cache_key: str,
    cache_value: str | None,
    event_channel: str,
    event: str,
    cache_ttl_seconds: int | None = None,
) -> None:
    """Store a value in the cache and publish an event.

    Args:
        valkey_client: The Valkey client to use for caching and publishing.
        cache_key: The key to store the value under in the cache.
        cache_value: The value to store in the cache.
            If None, the key will be deleted from the cache.
        event_channel: The channel to publish the event to.
        event: The event to publish.
        cache_ttl_seconds: Optional TTL for the cached value, in seconds.
    """
    if cache_value is None:
        await valkey_client.delete(cache_key)
    else:
        await valkey_client.set(
            cache_key,
            cache_value,
            ex=cache_ttl_seconds,
        )

    n = await valkey_client.publish(event_channel, event)
    log = f"Updated {cache_key} and published event to {event_channel}"
    if n == 0:
        logger.warning(f"{log} (no Valkey subscribers!)")
        logger.warning(
            f"Sent to: {event_channel}, "
            f"channels with subscribers: {await valkey_client.pubsub_channels()}"
        )
    else:
        logger.info(f"{log} ({n} Valkey subscriber(s))")
