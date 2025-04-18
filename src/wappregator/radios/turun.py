from typing import Any
import datetime
import re

import aiohttp

from wappregator import model
from wappregator.radios import base

BUILD_ID_RE = re.compile(r"\"buildId\":\"([\w-]+)\"")


class TurunFetcher(base.ListOfDictsFetcher):
    """Fetcher for Turun Wappuradio."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            name="Turun Wappuradio",
            url="https://turunwappuradio.com/",
        )

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        The API URL is constructed from the NextJS build ID found in the HTML
        of the index page. The build ID is extracted using a regex pattern.

        Args:
            session: The aiohttp session to use for the HTTP request.

        Returns:
            The URL for the radio's API endpoint.

        Raises:
            RadioError: If there was an error fetching the index or if the
                build ID could not be found from it.
        """
        async with session.get(self.url) as response:
            try:
                response.raise_for_status()
                html = await response.text()
            except (aiohttp.ClientResponseError, UnicodeDecodeError) as e:
                raise base.RadioError("Error loading Turun Wappuradio index") from e

            match = BUILD_ID_RE.search(html)
            if not match:
                raise base.RadioError(
                    "Couldn't find NextJS build ID in Turun Wappuradio index"
                )

            build_id = match.group(1)
            return f"{self.url}_next/data/{build_id}/index.json"

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
            title=entry["name"],
            description=entry.get("description"),
            host=entry.get("hosts"),
            producer=entry.get("producer"),
            photo=entry.get("pictureUrl"),
        )

    def parse_schedule(
        self,
        data: dict[str, Any],  # type: ignore[override]
    ) -> list[model.Program]:
        """Parse the schedule data into a list of Program objects.

        Args:
            data: The schedule data to parse.

        Returns:
            A list of Program objects.
        """
        props = data["pageProps"]
        shows = props["showsByDate"]
        return super().parse_schedule(
            [entry for lst in shows.values() for entry in lst]
        )
