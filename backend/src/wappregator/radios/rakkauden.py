import datetime
import logging

import aiohttp
import socketio
import valkey.asyncio as valkey

from wappregator import model
from wappregator.radios import base, poller

RADIO_ID = "rakkauden"

logger = logging.getLogger(__name__)


class RakkaudenFetcher(base.JSONFetcher):
    """Fetcher for Rakkauden Wappuradio, the wappuradio from Tampere."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id=RADIO_ID,
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


class RakkaudenPoller(poller.BasePoller):
    """Poller for Rakkauden Wappuradio."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(RADIO_ID)
        self.url = "https://wappuradio.fi/"

    async def loop(self, valkey_client: valkey.Valkey) -> None:
        """Poll the radio for updates.

        Args:
            valkey_client: The Valkey client to use for caching.
        """
        sio = socketio.AsyncClient()

        @sio.event
        async def np(data: dict[str, str]) -> None:
            if (song := data.get("song")) is None:
                logger.warning(f"Malformed nowplaying data received: {data}")
                return
            if type(song) is not str:
                logger.warning(f"Malformed nowplaying data received: {data}")
                return
            parts = song.split(" - ")
            song_model = (
                model.Song(title=parts[0])
                if len(parts) == 1
                else model.Song(title=parts[1], artist=parts[0])
            )
            await self.update_now_playing(valkey_client, song_model)

        await sio.connect(self.url)
        await sio.wait()
