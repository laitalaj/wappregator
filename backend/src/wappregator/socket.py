import sys
from typing import Any
from collections.abc import AsyncIterator
import asyncio
import contextlib
import logging
import os
import uuid

import socketio
import valkey.asyncio as valkey
from wapprecommon import model, internal_model, keys, listeners

from wappregator import radios

logger = logging.getLogger(__name__)

NOW_PLAYING_EVENT = "now_playing"
STREAM_STATUS_EVENT = "stream_status"
LISTENERS_EVENT = "listeners"

HEARBEAT_INTERVAL_SECONDS = 30
LISTENER_CHECK_INTERVAL_SECONDS = 10


def get_backend_id() -> str:
    """Get a unique ID for this backend instance."""
    return os.getenv("BACKEND_ID", str(uuid.uuid4()))


def task_exc_handler(task: asyncio.Task) -> None:
    """Handle exceptions of completed asyncio tasks.

    The idea here is to always crash the whole app with no survivors on uncaught
    background task exceptions. K8s will handle restarting the app.

    Args:
        task: The asyncio Task to check for exceptions.
    """
    try:
        exc = task.exception()
        if exc:
            logger.critical("Background task crashed", exc_info=exc)
            sys.exit(1)
    except asyncio.CancelledError:
        pass


def dump_song(song: model.Song | None) -> dict[str, str] | None:
    """Dump a Song object to a JSON-serializable dict.

    Args:
        song: The Song object to dump.

    Returns:
        A dict representing the song, or None if the input was None.
    """
    if song is None:
        return None

    res = song.model_dump()
    res["start"] = res["start"].isoformat()
    return res


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
    backend_id = get_backend_id()

    @sio.event
    async def connect(sid: str, environ: dict[str, str], auth: None) -> None:
        """Handle a new socket connection.

        Args:
            sid: The session ID of the socket connection.
            environ: Not used.
            auth: Not used.
        """
        async with valkey.Valkey(connection_pool=pool) as client:
            logger.debug("%s connected to the socket", sid)

            currently_playing = await radios.now_playing(client)
            await sio.emit(
                NOW_PLAYING_EVENT,
                {k: dump_song(v) for k, v in currently_playing.items()},
                to=sid,
            )

            stream_status = await radios.stream_status(client)
            await sio.emit(
                STREAM_STATUS_EVENT,
                stream_status,
                to=sid,
            )

            listener_counts = await listeners.get_listener_counts(
                client, [r.id for r in radios.FETCHERS]
            )
            await sio.emit(LISTENERS_EVENT, listener_counts, to=sid)

    @sio.event
    async def disconnect(sid: str, reason: str) -> None:
        """Handle a socket disconnection.

        Args:
            sid: The session ID of the socket connection.
            reason: The reason for the disconnection.
        """
        async with valkey.Valkey(connection_pool=pool) as client:
            logger.debug("%s disconnected from the socket: %s", sid, reason)
            await listeners.remove_client(client, backend_id, sid)

    @sio.event
    async def change_channel(sid: str, data: str) -> None:
        """Handle a station change event.

        Args:
            sid: The session ID of the socket connection.
            data: The ID of the new radio station the client is listening to.
        """
        async with valkey.Valkey(connection_pool=pool) as client:
            logger.debug("%s changed channel to %s", sid, data)
            await listeners.change_channel(client, backend_id, sid, data)

    async def handle_nowplaying_event(msg: dict[str, Any]) -> None:
        """Handle now playing events from Valkey."""
        event = internal_model.NowPlayingEvent.model_validate_json(msg["data"])
        logger.info("Broadcasting a now-playing update: %s", event)
        await sio.emit(
            NOW_PLAYING_EVENT,
            {event.radio_id: dump_song(event.now_playing)},
        )

    async def handle_streamstatus_event(msg: dict[str, Any]) -> None:
        """Handle stream status events from Valkey."""
        event = internal_model.StreamStatusEvent.model_validate_json(msg["data"])
        logger.info("Broadcasting a stream status update: %s", event)
        await sio.emit(
            STREAM_STATUS_EVENT,
            {
                event.radio_id: event.stream_status,
            },
        )

    async def listener_updates() -> None:
        """Periodically check listener counts and broadcast updates."""
        radio_ids = [radio.id for radio in radios.FETCHERS]
        previous_counts: dict[str, int] = {}
        while True:
            async with valkey.Valkey(connection_pool=pool) as client:
                counts = await listeners.get_listener_counts(client, radio_ids)
                if counts != previous_counts:
                    logger.info("Broadcasting a listener count update: %s", counts)
                    await sio.emit(LISTENERS_EVENT, counts)
                    previous_counts = counts
                await asyncio.sleep(LISTENER_CHECK_INTERVAL_SECONDS)

    async def heartbeat() -> None:
        """Periodically set heartbeat in Valkey to indicate that we're alive."""
        while True:
            async with valkey.Valkey(connection_pool=pool) as client:
                logger.debug("Heartbeat for %s", backend_id)
                await listeners.backend_heartbeat(client, backend_id)
                await asyncio.sleep(HEARBEAT_INTERVAL_SECONDS)

    async with valkey.Valkey(connection_pool=pool) as client:
        await listeners.add_backend(client, backend_id)

    pubsub_client = valkey.Valkey(connection_pool=pool)
    pubsub = pubsub_client.pubsub()
    await pubsub.subscribe(
        **{
            keys.NOWPLAYING_CHANNEL: handle_nowplaying_event,
            keys.STREAMSTATUS_CHANNEL: handle_streamstatus_event,
        }
    )

    bg_tasks = [
        sio.start_background_task(task)
        for task in [pubsub.run, listener_updates, heartbeat]
    ]
    for task in bg_tasks:
        task.add_done_callback(task_exc_handler)

    try:
        yield
    finally:
        for task in bg_tasks:
            task.cancel()

        async with valkey.Valkey(connection_pool=pool) as client:
            await listeners.cleanup_backend(client, backend_id)

        await pubsub.aclose()
        await pubsub_client.aclose()
