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
        current_artist = None
        current_title = None
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    async with session.get(self.url) as response:
                        response.raise_for_status()
                        data = await response.json(content_type=None)
                        title = data["song"]
                        artist = data.get("artist")
                        if title == current_title and artist == current_artist:
                            continue

                        current_title = title
                        current_artist = artist
                        song = model.Song(
                            title=title,
                            artist=artist,
                        )
                        await self.update_now_playing(valkey_client, song)
                except (KeyError, aiohttp.ClientResponseError, UnicodeDecodeError) as e:
                    logger.exception(
                        "Error loading Turun Wappuradio metadata", exc_info=e
                    )
                await asyncio.sleep(METADATA_POLL_INTERVAL_SECONDS)
