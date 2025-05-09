from abc import ABC, abstractmethod
import asyncio
import logging

import aiohttp
import valkey.asyncio as valkey
from wapprecommon import model, internal_model, keys

CACHE_VERSION = 1
CACHE_NAMESPACE = "nowplaying"
CACHE_KEY_PREFIX = f"{CACHE_NAMESPACE}:{CACHE_VERSION}:"
CACHE_TTL_SECONDS = 60 * 15
HTTP_POLL_INTERVAL_SECONDS = 30

logger = logging.getLogger(__name__)


class BasePoller(ABC):
    """Base class for polling currently playing songs."""

    def __init__(self, id: str) -> None:
        """Initialize the poller.

        Args:
            id: The ID of the radio station.
        """
        self.id = id

    @property
    def cache_key(self) -> str:
        """Get the cache key for the currently playing song.

        Returns:
            The cache key for the currently playing song.
        """
        return keys.get_nowplaying_key(self.id)

    async def update_now_playing(
        self,
        valkey_client: valkey.Valkey,
        song: model.Song | None,
    ) -> None:
        """Update the currently playing song in the cache.

        Args:
            valkey_client: The Valkey client to use for caching.
            song: The currently playing song.
        """
        if song is None:
            await valkey_client.delete(self.cache_key)
        else:
            await valkey_client.set(
                self.cache_key,
                song.model_dump_json(),
                # A safeguard for clearing this if polling breaks
                ex=CACHE_TTL_SECONDS,
            )

        n = await valkey_client.publish(
            keys.EVENTS_CHANNEL,
            internal_model.PollerEvent(
                radio_id=self.id,
                now_playing=song,
            ).model_dump_json(),
        )
        log = f"{self.id} is now playing {song}"
        if n == 0:
            logger.warning(f"{log} (no Valkey subscribers!)")
            logger.warning(
                f"Sent to: {keys.EVENTS_CHANNEL}, "
                f"channels with subscribers: {await valkey_client.pubsub_channels()}"
            )
        else:
            logger.info(f"{log} (published to {n} Valkey subscriber(s))")

    @abstractmethod
    async def loop(self, valkey_client: valkey.Valkey) -> None:
        """Poll the currently playing song in an infinite loop.

        The implementation should call `update_now_playing` accordingly.

        Args:
            valkey_client: The Valkey client to use for caching.
        """
        ...

    async def loop_wrapper(self, connection_pool: valkey.ConnectionPool) -> None:
        """Poll the currently playing song in a loop while handling exceptions.

        Args:
            connection_pool: The Valkey connection pool to use for caching.
        """
        while True:
            try:
                async with valkey.Valkey(
                    connection_pool=connection_pool
                ) as valkey_client:
                    await self.loop(valkey_client)
            except Exception:
                logger.exception(f"Error in poller loop for {self.id}")
            finally:
                logger.warning(
                    f"Poller loop for {self.id} ended, restarting in 5 seconds"
                )
                await asyncio.sleep(5)

    async def now_playing(self, valkey_client: valkey.Valkey) -> model.Song | None:
        """Get the currently playing song.

        Args:
            valkey_client: The Valkey client to use for caching.

        Returns:
            The currently playing song.
        """
        res = await valkey_client.get(self.cache_key)
        if res:
            return model.Song.model_validate_json(res)
        return None


class HTTPPoller(BasePoller):
    """Poller for repeatedly polling a HTTP endpoint."""

    def __init__(self, id: str, url: str) -> None:
        """Initialize the poller.

        Args:
            id: The ID of the radio station.
            url: The URL to poll for metadata.
        """
        super().__init__(id)
        self.url = url

    @abstractmethod
    async def handle_response(
        self, response: aiohttp.ClientResponse
    ) -> model.Song | None:
        """Handle the response from the HTTP request.

        Args:
            response: The response object from the aiohttp request.

        Returns:
            The currently playing song, or None if no song is playing.
        """
        ...

    async def loop(self, valkey_client: valkey.Valkey) -> None:
        """Poll the currently playing song in a loop.

        Args:
            valkey_client: The Valkey client to use for caching.
        """
        now_playing = None
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    logger.info(f"Polling {self.url} for {self.id}")
                    async with session.get(self.url) as response:
                        response.raise_for_status()
                        result = await self.handle_response(response)
                        if result != now_playing:
                            now_playing = result
                            await self.update_now_playing(valkey_client, result)
                except (
                    KeyError,
                    aiohttp.ClientResponseError,
                    aiohttp.ContentTypeError,
                    UnicodeDecodeError,
                ):
                    logger.exception(f"Error loading now_playing for {self.id}")
                await asyncio.sleep(HTTP_POLL_INTERVAL_SECONDS)
