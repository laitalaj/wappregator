import datetime

import aiohttp

from wappregator import model
from wappregator.radios import base


class RakkaudenFetcher(base.JSONFetcher):
    """Fetcher for Rakkauden Wappuradio, the wappuradio from Tampere."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id="rakkauden",
            name="Rakkauden Wappuradio",
            url="https://wappuradio.fi/",
            location="Tampere",
            frequency_mhz=101.6,
            brand=model.Brand(
                background_color="rgb(211, 59, 111)",
                text_color="white",
            ),
            streams=[
                model.Stream(
                    url="https://stream1.wappuradio.fi/wappuradio.opus",
                    mime_type="audio/ogg",
                ),
                model.Stream(
                    url="https://stream2.wappuradio.fi/wappuradio.opus",
                    mime_type="audio/ogg",
                ),
                model.Stream(
                    url="https://stream1.wappuradio.fi/wappuradio.ogg",
                    mime_type="audio/ogg",
                ),
                model.Stream(
                    url="https://stream2.wappuradio.fi/wappuradio.ogg",
                    mime_type="audio/ogg",
                ),
                model.Stream(
                    url="https://stream1.wappuradio.fi/wappuradio.mp3",
                    mime_type="audio/mpeg",
                ),
                model.Stream(
                    url="https://stream2.wappuradio.fi/wappuradio.mp3",
                    mime_type="audio/mpeg",
                ),
            ],
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

    def parse_one(self, entry: dict[str, str]) -> model.Program:
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
            photo=entry.get("photo"),
        )
