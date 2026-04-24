from importlib import resources
from typing import Any

import aiohttp
import valkey.asyncio as valkey
from wapprecommon import model, radios

from wappregator.radios import base


class SateilyFetcher(base.BaseFetcher):
    """Fetcher for Radio Säteily, the wappuradio from Rovaniemi.

    They don't have an API, so the schedule is bundled as a static JSON file
    (parsed by hand from an image they published).
    """

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(radios.SATEILY)

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Not used - schedule is loaded from a bundled file."""
        raise NotImplementedError("SateilyFetcher does not have an API URL")

    async def parse_response(self, response: aiohttp.ClientResponse) -> Any:
        """Not used - schedule is loaded from a bundled file."""
        raise NotImplementedError("SateilyFetcher does not fetch over HTTP")

    def parse_schedule(self, data: bytes) -> list[model.Program]:
        """Parse the schedule JSON into Program objects.

        Args:
            data: The raw contents of the bundled JSON file.

        Returns:
            The schedule for the radio station.
        """
        return base.adapter.validate_json(data)

    async def __call__(
        self, session: aiohttp.ClientSession, valkey_client: valkey.Valkey
    ) -> list[model.Program]:
        """Return the schedule directly from the bundled JSON file.

        The schedule is static, so there's no need to hit the network or cache.
        """
        raw = resources.files(__package__).joinpath("sateily.json").read_bytes()
        return sorted(self.parse_schedule(raw), key=lambda x: x.start)
