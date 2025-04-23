import logging

import socketio
import valkey.asyncio as valkey
from wapprecommon import radios, model

from wapprepollers.pollers import base

logger = logging.getLogger(__name__)


class RakkaudenPoller(base.BasePoller):
    """Poller for Rakkauden Wappuradio."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(radios.RAKKAUDEN.id)
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
