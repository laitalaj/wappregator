import datetime

import aiohttp

from wappregator import model
from wappregator.radios import base, utils


class DiodiFetcher(base.JSONFetcher):
    """Fetcher for Radio Diodi, the wappuradio from Otaniemi."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id="diodi",
            name="Radio Diodi",
            url="https://radiodiodi.fi/",
            brand=model.Brand(
                backgroundColor="rgb(220, 246, 220)",
                textColor="rgb(39, 83, 40)",
            ),
            streams=[
                model.Stream(
                    url="https://virta.radiodiodi.fi/flac",
                    mime_type="audio/flac",
                ),
                model.Stream(
                    url="https://virta.radiodiodi.fi/mp3",
                    mime_type="audio/mpeg",
                ),
                model.Stream(
                    url="https://virta.radiodiodi.fi/aac",
                    mime_type="audio/aac",
                ),
            ],
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

    def parse_one(self, entry: dict[str, str]) -> model.Program:
        """Parse a single entry from the schedule data.

        Args:
            entry: The entry to parse.

        Returns:
            A Program object representing the entry.

        Raises:
            ValueError: If the entry is malformed.
        """
        title = utils.sanitize_value(entry["title"])
        if title is None:
            raise ValueError("Malformed entry in Diodi API: title is None")

        return model.Program(
            start=datetime.datetime.fromisoformat(entry["start"]),
            end=datetime.datetime.fromisoformat(entry["end"]),
            title=title,
            description=utils.sanitize_value(entry.get("description")),
            genre=utils.sanitize_value(entry.get("genre")),
            host=utils.sanitize_value(entry.get("team")),
            photo=utils.sanitize_value(entry.get("image")),
        )
