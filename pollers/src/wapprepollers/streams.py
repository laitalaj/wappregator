import asyncio
import logging
import json

import aiohttp
import m3u8
import valkey.asyncio as valkey

from wapprecommon import model, internal_model, keys

from wapprepollers import utils

logger = logging.getLogger(__name__)

STREAM_CHECKER_BYTES_TO_READ = 1024
STREAM_CHECKER_TIMEOUT = aiohttp.ClientTimeout(total=10)  # (seconds)
STREAM_CHECKER_INTERVAL_SECONDS = 30
M3U8_MIME_TYPES = ["application/x-mpegURL", "application/vnd.apple.mpegurl"]


class StreamChecker:
    """A poller service that checks if a radio's streams are working."""

    def __init__(self, radio: model.Radio) -> None:
        """Initialize the StreamChecker.

        Args:
            radio: The radio whose streams to check.
        """
        self.radio = radio

    @property
    def cache_key(self) -> str:
        """Get the cache key for the stream status of this radio.

        Returns:
            The cache key for the stream status of this radio.
        """
        return keys.get_streamstatus_key(self.radio.id)

    @staticmethod
    async def _validate_response(response: aiohttp.ClientResponse) -> bool:
        await response.content.read(STREAM_CHECKER_BYTES_TO_READ)
        return True

    @staticmethod
    async def _validate_m3u8(
        response: aiohttp.ClientResponse,
        playlist_url: str,
        session: aiohttp.ClientSession,
    ) -> bool:
        content = await response.text()
        playlist = m3u8.loads(content, uri=playlist_url)

        if playlist.is_variant:
            if not playlist.playlists:
                logger.debug(
                    f"No playlists found in m3u8 variant playlist at {playlist_url}"
                )
                return False
            return await StreamChecker._check_stream(
                session, playlist.playlists[0].absolute_uri, True
            )

        if not playlist.segments:
            logger.debug(f"No segments found in m3u8 playlist at {playlist_url}")
            return False
        return await StreamChecker._check_stream(
            session, playlist.segments[-1].absolute_uri
        )

    @staticmethod
    async def _check_stream(
        session: aiohttp.ClientSession, url: str, is_m3u8: bool = False
    ) -> bool:
        try:
            async with session.get(url, timeout=STREAM_CHECKER_TIMEOUT) as response:
                if response.status != 200:
                    logger.debug(f"Non-200 status ({response.status}) for {url}")
                    return False
                if is_m3u8:
                    return await StreamChecker._validate_m3u8(response, url, session)
                return await StreamChecker._validate_response(response)
        except aiohttp.ClientError:
            logger.debug(f"Stream check failed for {url}", exc_info=True)
            return False
        except asyncio.TimeoutError:
            logger.debug(f"Stream check timed out for {url}", exc_info=True)
            return False

    async def check(self) -> dict[str, bool]:  # TODO: internal_model?
        """Check all streams of the radio.

        Returns:
            A dict mapping stream URLs to booleans indicating whether the stream
            is working.
        """
        tasks: dict[str, asyncio.Task[bool]] = {}
        async with aiohttp.ClientSession() as session:
            async with asyncio.TaskGroup() as tg:
                for stream in self.radio.streams:
                    is_m3u8 = stream.mime_type in M3U8_MIME_TYPES
                    tasks[stream.url] = tg.create_task(
                        self._check_stream(session, stream.url, is_m3u8)
                    )
        return {url: task.result() for url, task in tasks.items()}

    async def update_status(
        self, valkey_client: valkey.Valkey, status: dict[str, bool]
    ) -> None:
        """Update the stream status in the cache & publish an event.

        Args:
            valkey_client: The Valkey client to use for caching.
            status: A dict mapping stream URLs to booleans indicating
                whether the stream is working.
        """
        logger.info(f"Stream status for {self.radio.id}: {status}")
        await utils.store_and_publish(
            valkey_client=valkey_client,
            cache_key=self.cache_key,
            cache_value=json.dumps(status),
            event_channel=keys.STREAMSTATUS_CHANNEL,
            event=internal_model.StreamStatusEvent(
                radio_id=self.radio.id,
                stream_status=status,
            ).model_dump_json(),
        )

    async def loop(self, valkey_client: valkey.Valkey) -> None:
        """Check the streams in an infinite loop and update the status accordingly.

        Args:
            valkey_client: The Valkey client to use for caching.
        """
        status = None
        while True:
            logger.info(f"Checking streams for {self.radio.id}")
            result = await self.check()
            if result != status:
                status = result
                await self.update_status(valkey_client, result)
            await asyncio.sleep(STREAM_CHECKER_INTERVAL_SECONDS)

    async def loop_wrapper(self, connection_pool: valkey.ConnectionPool) -> None:
        """Check the streams in a loop while handling exceptions.

        Args:
            connection_pool: The Valkey connection pool to use.
        """
        await utils.loop_wrapper(
            type="Stream Status",
            id=self.radio.id,
            loop_func=self.loop,
            connection_pool=connection_pool,
        )
