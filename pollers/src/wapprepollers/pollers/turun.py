import asyncio
import logging

import aiohttp
import valkey.asyncio as valkey
from wapprecommon import radios, model

from wapprepollers.pollers import base

METADATA_POLL_INTERVAL_SECONDS = 30

logger = logging.getLogger(__name__)


class TurunPoller(base.BasePoller):
    """Poller for Turun Wappuradio."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(radios.TURUN.id)
        self.url = "https://json.turunwappuradio.com/metadata.json"

    async def loop(self, valkey_client: valkey.Valkey) -> None:
        """Poll the currently playing song in a loop.

        Args:
            valkey_client: The Valkey client to use for caching.
        """
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    async with session.get(self.url) as response:
                        response.raise_for_status()
                        data = await response.json(content_type=None)
                        song = model.Song(
                            title=data["song"],
                            artist=data.get("artist"),
                        )
                        await self.update_now_playing(valkey_client, song)
                except (KeyError, aiohttp.ClientResponseError, UnicodeDecodeError) as e:
                    logger.exception(
                        "Error loading Turun Wappuradio metadata", exc_info=e
                    )
                await asyncio.sleep(METADATA_POLL_INTERVAL_SECONDS)
