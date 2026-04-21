import logging
import re

import aiohttp
from wapprecommon import radios, model

from wapprepollers.pollers import base

logger = logging.getLogger(__name__)
SPLIT_RE = re.compile(r"\s*[\u2013\u2014-]\s*")  # Matches (e[nm])?dash


class RattoPoller(base.HTTPPoller):
    """Poller for Rattoradio."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(
            id=radios.RATTO.id,
            url="https://www.rattoradio.fi/nyt-soi/",
        )

    async def check_response(self, response: aiohttp.ClientResponse) -> bool:
        """Check if the HTTP response is valid.

        Override for the base method, as Ratto gives us a 403 when off-season.

        Args:
            response: The HTTP response to check.

        Returns:
            True if the response is valid, False otherwise.

        Raises:
            aiohttp.ClientResponseError: If the response status is not OK and not 403.
        """
        if response.status == 403:
            return False
        return await super().check_response(response)

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

        parts = SPLIT_RE.split(data)
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
