from typing import Any
import datetime

import aiohttp

from wappregator import model
from wappregator.radios import base
from urllib.parse import quote

WINDOW_DAYS = 7


class NorppaFetcher(base.BaseFetcher):
    """Fetcher for Norpparadio, the wappuradio from lappeen Ranta."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            name="Norpparadio",
            url="https://norpparadio.net/",
        )

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        Norpparadio nicely allows a start-end query string.
        We set it to WINDOW_DAYS days before today and 2nd of May.

        Args:
            session: Not used.

        Returns:
            The URL for the radio's API endpoint.
        """
        today = datetime.datetime.now().astimezone()
        today_minus_window = today - datetime.timedelta(days=WINDOW_DAYS)

        may_second = today.replace(
            month=5, day=2, hour=0, minute=0, second=0, microsecond=0
        )
        may_second_minus_window = may_second - datetime.timedelta(days=WINDOW_DAYS)

        start_time = min(today_minus_window, may_second_minus_window)
        return (
            f"https://norpparadio.net/api/shows"
            f"?start={quote(start_time.isoformat())}"
            f"&end={quote(may_second.isoformat())}"
        )

    @classmethod
    def parse_one(cls, entry: dict[str, Any]) -> model.Program:
        """Parse a single entry from the schedule data.

        Args:
            entry: The entry to parse.

        Returns:
            A Program object representing the entry.
        """
        extended_props: dict[str, str] = entry.get("extendedProps", {})
        return model.Program(
            start=datetime.datetime.fromisoformat(entry["start"]),
            end=datetime.datetime.fromisoformat(entry["end"]),
            title=entry["title"],
            description=extended_props.get("description"),
        )

    def parse_schedule(self, data: list[dict[str, str]]) -> list[model.Program]:
        """Parse the schedule data into a list of Program objects.

        Args:
            data: The schedule data to parse.

        Returns:
            A list of Program objects.
        """
        return [self.parse_one(entry) for entry in data]
