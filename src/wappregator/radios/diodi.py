import datetime

import aiohttp

from wappregator import model
from wappregator.radios import base


class DiodiFetcher(base.BaseFetcher):
    """Fetcher for Radio Diodi, the wappuradio from Otaniemi."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            name="Radio Diodi",
            url="https://radiodiodi.fi/",
        )
        self.api_url = "https://api.radiodiodi.fi/programmes"

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        Args:
            session: Not used.

        Returns:
            The URL for the radio's API endpoint.
        """
        return self.api_url

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
            description=entry.get("description"),
            genre=entry.get("genre"),
            host=entry.get("team"),
            photo=entry.get("image"),
        )

    def parse_schedule(self, data: list[dict[str, str]]) -> list[model.Program]:
        """Parse the schedule data into a list of Program objects.

        Args:
            data: The schedule data to parse.

        Returns:
            A list of Program objects.
        """
        return [self.parse_one(entry) for entry in data]
