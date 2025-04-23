import json
import logging

import valkey.asyncio as valkey
from websockets.asyncio import client as ws_client
from websockets import exceptions as ws_exceptions
from wapprecommon import model, radios

from wapprepollers.pollers import base

logger = logging.getLogger(__name__)


class DiodiPoller(base.BasePoller):
    """Poller for Diodi."""

    def __init__(self) -> None:
        """Initialize the poller."""
        super().__init__(radios.DIODI.id)
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
