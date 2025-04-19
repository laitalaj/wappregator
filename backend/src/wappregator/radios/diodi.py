import datetime
import re

import aiohttp

from wappregator import model
from wappregator.radios import base

TAG_RE = re.compile(r"<[^>]+>")


class DiodiFetcher(base.ListOfDictsFetcher):
    """Fetcher for Radio Diodi, the wappuradio from Otaniemi."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id="diodi",
            name="Radio Diodi",
            url="https://radiodiodi.fi/",
            stream="https://virta.radiodiodi.fi/mp3",
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

    def sanitize_value(self, value: str | None) -> str | None:
        """Sanitize a value.

        Removes HTML tags and turns empty strings into None.

        Args:
            value: The value to sanitize.

        Returns:
            The sanitized value.
        """
        if value is None:
            return None
        # Not the most sophisticated HTML sanitizer, but it will do for now.
        res = TAG_RE.sub("", value)
        if res == "":
            return None
        return res

    def parse_one(self, entry: dict[str, str]) -> model.Program:
        """Parse a single entry from the schedule data.

        Args:
            entry: The entry to parse.

        Returns:
            A Program object representing the entry.

        Raises:
            ValueError: If the entry is malformed.
        """
        title = self.sanitize_value(entry["title"])
        if title is None:
            raise ValueError("Malformed entry in Diodi API: title is None")

        return model.Program(
            start=datetime.datetime.fromisoformat(entry["start"]),
            end=datetime.datetime.fromisoformat(entry["end"]),
            title=title,
            description=self.sanitize_value(entry.get("description")),
            genre=self.sanitize_value(entry.get("genre")),
            host=self.sanitize_value(entry.get("team")),
            photo=self.sanitize_value(entry.get("image")),
        )
