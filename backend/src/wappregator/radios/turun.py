from typing import Any
import asyncio
import datetime
import re
import logging

import aiohttp
import valkey.asyncio as valkey

from wappregator import model
from wappregator.radios import base, poller

RADIO_ID = "turun"
BUILD_ID_RE = re.compile(r"\"buildId\":\"([\w-]+)\"")
METADATA_POLL_INTERVAL_SECONDS = 30


logger = logging.getLogger(__name__)


class TurunFetcher(base.JSONFetcher):
    """Fetcher for Turun Wappuradio."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id=RADIO_ID,
            name="Turun Wappuradio",
            url="https://turunwappuradio.com/",
            location="Suomen Turku",
            frequency_mhz=93.8,
            brand=model.Brand(
                background_color="rgb(0, 51, 102)",
                text_color="rgb(238, 107, 96)",
            ),
            streams=[
                model.Stream(
                    url="https://stream.turunwappuradio.com/twr_hifi.m3u8",
                    # This means HLS
                    mime_type="application/x-mpegURL",
                ),
            ],
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
        photo = entry.get("pictureUrl")
        if photo is not None and photo.startswith("/"):
            photo = self.url + photo[1:]
        return model.Program(
            start=datetime.datetime.fromisoformat(entry["start"]),
            end=datetime.datetime.fromisoformat(entry["end"]),
            title=entry["name"],
            description=entry.get("description"),
            host=entry.get("hosts"),
            producer=entry.get("producer"),
            photo=photo,
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


class TurunPoller(poller.BasePoller):
    """Poller for Turun Wappuradio."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(RADIO_ID)
        self.url = "https://json.turunwappuradio.com/metadata.json"

    async def loop(self, valkey_client: valkey.Valkey) -> None:
        """Poll the currently playing song in a loop.

        Args:
            valkey_client: The Valkey client to use for caching.
        """
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    async with session.get(self.url) as response:
                        response.raise_for_status()
                        data = await response.json(content_type=None)
                        song = model.Song(
                            title=data["song"],
                            artist=data.get("artist"),
                        )
                        await self.update_now_playing(valkey_client, song)
                except (KeyError, aiohttp.ClientResponseError, UnicodeDecodeError) as e:
                    logger.exception(
                        "Error loading Turun Wappuradio metadata", exc_info=e
                    )
                await asyncio.sleep(METADATA_POLL_INTERVAL_SECONDS)
