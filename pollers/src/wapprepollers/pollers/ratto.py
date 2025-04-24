import logging

import aiohttp
from wapprecommon import radios, model

from wapprepollers.pollers import base

logger = logging.getLogger(__name__)


class RattoPoller(base.HTTPPoller):
    """Poller for Rattoradio."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(
            id=radios.RATTO.id,
            url="https://www.rattoradio.fi/nyt-soi/",
        )

    async def handle_response(
        self, response: aiohttp.ClientResponse
    ) -> model.Song | None:
        """Handle the response from the HTTP request.

        Args:
            response: The response object from the aiohttp request.

        Returns:
            The currently playing song, or None if no song is playing.
        """
        data = await response.text()
        if not data:
            return None

        parts = data.split(" - ")
        if len(parts) == 1:
            artist = None
            title = parts[0]
        else:
            artist = parts[0]
            title = " - ".join(parts[1:])

        return model.Song(
            title=title,
            artist=artist,
        )
