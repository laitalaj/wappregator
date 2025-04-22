import datetime
import json
import logging

import aiohttp
import valkey.asyncio as valkey
from websockets.asyncio import client as ws_client
from websockets import exceptions as ws_exceptions

from wappregator import model
from wappregator.radios import base, poller, utils

RADIO_ID = "diodi"


logger = logging.getLogger(__name__)


class DiodiFetcher(base.JSONFetcher):
    """Fetcher for Radio Diodi, the wappuradio from Otaniemi."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id=RADIO_ID,
            name="Radio Diodi",
            url="https://radiodiodi.fi/",
            location="Otaniemi",
            frequency_mhz=102,
            brand=model.Brand(
                background_color="rgb(220, 246, 220)",
                text_color="rgb(39, 83, 40)",
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


class DiodiPoller(poller.BasePoller):
    """Poller for Diodi."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(RADIO_ID)
        self.url = "wss://wsapi.radiodiodi.fi/"

    async def loop(self, valkey_client: valkey.Valkey) -> None:
        """Poll the currently playing song in a loop.

        Args:
            valkey_client: The Valkey client to use for caching.
        """
        async for websocket in ws_client.connect(self.url):
            try:
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        if (song := data.get("song")) is None:
                            continue
                        if type(song) is not dict:
                            logger.warning(
                                f"Received malformed data from websocket: {message!r}"
                            )
                            continue
                        if song:
                            if song.get("title") is None:
                                logger.warning(f"Song is missing a title: {message!r}")
                                continue
                            song_model = model.Song(
                                title=song["title"],
                                artist=song.get("artist"),
                            )
                            await self.update_now_playing(valkey_client, song_model)
                        else:
                            await self.update_now_playing(valkey_client, None)
                    except json.JSONDecodeError:
                        logger.warning(
                            f"Failed to decode websocket message: {message!r}",
                            exc_info=True,
                        )
                        continue
            except ws_exceptions.ConnectionClosed:
                continue
