import logging

import aiohttp
from wapprecommon import radios, model

from wapprepollers.pollers import base

logger = logging.getLogger(__name__)


class TurunPoller(base.HTTPPoller):
    """Poller for Turun Wappuradio."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(
            id=radios.TURUN.id,
            url="https://json.turunwappuradio.com/metadata.json",
        )

    async def handle_response(self, response: aiohttp.ClientResponse) -> model.Song:
        """Handle the response from the HTTP request.

        Args:
            response: The response object from the aiohttp request.
            valkey_client: The Valkey client to use for caching.

        Returns:
            The currently playing song.
        """
        data = await response.json(content_type=None)
        title = data["song"]
        artist = data.get("artist")
        return model.Song(
            title=title,
            artist=artist,
        )
