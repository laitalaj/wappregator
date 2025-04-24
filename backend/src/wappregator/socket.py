from typing import Any
from collections.abc import AsyncIterator
import asyncio
import contextlib
import logging

import socketio
import valkey.asyncio as valkey
from wapprecommon import internal_model, keys

from wappregator import radios

logger = logging.getLogger(__name__)


@contextlib.asynccontextmanager
async def setup_socketio(
    sio: socketio.AsyncServer, pool: valkey.ConnectionPool
) -> AsyncIterator[None]:
    """Set up SocketIO functionality.

    Args:
        sio: The SocketIO server instance.
        pool: The Valkey connection pool.

    Yields:
        None
    """

    @sio.event
    async def connect(sid: str, environ: dict[str, str], auth: None) -> None:
        """Handle a new socket connection.

        Args:
            sid: The session ID of the socket connection.
            environ: Not used.
            auth: Not used.
        """
        async with valkey.Valkey(connection_pool=pool) as client:
            currently_playing = await radios.now_playing(client)
            await sio.emit(
                "now_playing",
                {
                    k: v.model_dump() if v is not None else None
                    for k, v in currently_playing.items()
                },
                to=sid,
            )

    async def handle_valkey_message(msg: dict[str, Any]) -> None:
        """Handle messages from Valkey."""
        event = internal_model.PollerEvent.model_validate_json(msg["data"])
        logger.info("Broadcasting event via SocketIO: %s", event)
        await sio.emit(
            "now_playing",
            {
                event.radio_id: event.now_playing.model_dump()
                if event.now_playing
                else None
            },
        )

    pubsub_client = valkey.Valkey(connection_pool=pool)
    pubsub = pubsub_client.pubsub()
    await pubsub.subscribe(**{keys.EVENTS_CHANNEL: handle_valkey_message})
    socketio_task = asyncio.create_task(pubsub.run())

    try:
        yield
    finally:
        socketio_task.cancel()
        await pubsub.aclose()
        await pubsub_client.aclose()
