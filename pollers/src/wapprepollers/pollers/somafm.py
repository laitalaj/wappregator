import logging

import aiohttp
from wapprecommon import dev_radios, model

from wapprepollers.pollers import base

logger = logging.getLogger(__name__)


class SomaFMPoller(base.HTTPPoller):
    """Poller for SomaFM channels (dev stations)."""

    def __init__(self, radio_id: str, channel_slug: str) -> None:
        """Initialize the poller.

        Args:
            radio_id: The ID of the radio station.
            channel_slug: The SomaFM channel slug for the songs API.
        """
        super().__init__(
            id=radio_id,
            url=f"https://somafm.com/songs/{channel_slug}.json",
        )

    async def handle_response(
        self, response: aiohttp.ClientResponse
    ) -> model.Song | None:
        """Handle the response from the SomaFM songs API.

        Args:
            response: The response object from the aiohttp request.

        Returns:
            The currently playing song, or None if no song data is available.
        """
        data = await response.json(content_type=None)
        songs = data.get("songs", [])
        if not songs:
            return None
        song = songs[0]
        return model.Song(title=song["title"], artist=song.get("artist"))


def get_somafm_pollers() -> list[SomaFMPoller]:
    """Get pollers for all SomaFM dev stations.

    Returns:
        A list of SomaFMPoller instances.
    """
    return [
        SomaFMPoller(dev_radios.BOSSA.id, "bossa"),
        SomaFMPoller(dev_radios.GROOVESALAD.id, "groovesalad"),
        SomaFMPoller(dev_radios.DEFCON.id, "defcon"),
        SomaFMPoller(dev_radios.VAPORWAVES.id, "vaporwaves"),
    ]
