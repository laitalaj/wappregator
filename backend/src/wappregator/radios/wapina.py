import datetime

import aiohttp

from wappregator import model
from wappregator.radios import base


class WapinaFetcher(base.JSONFetcher):
    """Fetcher for Radio Wapina, the wappuradio from Vaasa."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id="wapina",
            name="Radio Wapina",
            url="https://wapina.fi/",
            location="Vaasa",
            brand=model.Brand(
                background_color="rgb(255, 180, 20)",
                text_color="black",
            ),
            streams=[
                # These URLs are identical for both streams - maybe the endpoint serves different data depending on headers?
                model.Stream(
                    url="https://s5.radio.co/s484b62a6d/listen",
                    mime_type="audio/ogg",
                ),
                model.Stream(
                    url="https://s5.radio.co/s484b62a6d/listen",
                    mime_type="audio/mpeg",
                ),
            ]
        )
        self.api_url = "https://radio-wapina-default-rtdb.firebaseio.com/programs.json"

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
        """
        start_time = datetime.time.fromisoformat(entry["startTime"])
        end_time = datetime.time.fromisoformat(
            entry["end_time"]  # Keeping it consistent :-D
        )
        date = datetime.date.fromisoformat(entry["date"])
        tz = datetime.timezone(datetime.timedelta(hours=3))
        return model.Program(
            start=datetime.datetime.combine(date, start_time, tz),
            end=datetime.datetime.combine(date, end_time, tz),
            title=entry["programName"],
            description=entry.get("info"),
            host=entry.get("groupName"),
        )

    def parse_schedule(
        self,
        data: dict[str, dict[str, dict[str, str]]],  # type: ignore[override]
    ) -> list[model.Program]:
        """Parse the schedule data into a list of Program objects.

        Args:
            data: The schedule data to parse.

        Returns:
            A list of Program objects.
        """
        return super().parse_schedule([entry["program"] for entry in data.values()])
