import datetime

import aiohttp

from wappregator import model
from wappregator.radios import base


class RakkaudenFetcher(base.BaseFetcher):
    """Fetcher for Rakkauden Wappuradio, the wappuradio from Tampere."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            name="Rakkauden Wappuradio",
            url="https://wappuradio.fi/",
        )
        self.endpoint = "api/programs"

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        Args:
            session: Not used.

        Returns:
            The URL for the radio's API endpoint.
        """
        return f"{self.url}{self.endpoint}"

    @classmethod
    def parse_one(cls, entry: dict[str, str]) -> model.Program:
        """Parse a single entry from the schedule data.

        Args:
            entry: The entry to parse.

        Returns:
            A Program object representing the entry.
        """
        return model.Program(
            start=datetime.datetime.fromisoformat(entry["start"]),
            end=datetime.datetime.fromisoformat(entry["end"]),
            title=entry["title"],
            description=entry.get("desc"),
            host=entry.get("host"),
            producer=entry.get("prod"),
            photo=entry.get("thumb"),
        )

    def parse_schedule(self, data: list[dict[str, str]]) -> list[model.Program]:
        """Parse the schedule data into a list of Program objects.

        Args:
            data: The schedule data to parse.

        Returns:
            A list of Program objects.
        """
        return [self.parse_one(entry) for entry in data]
