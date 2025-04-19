import aiohttp
import asyncio
from datetime import datetime
import logging

import valkey.asyncio as valkey

from wappregator import model
from wappregator.radios import diodi, norppa, rakkauden, turun, wapina

logger = logging.getLogger(__name__)


class FetchingBrokenError(Exception):
    """Exception for errors that are due to radio fetching being broken on our end."""

    pass


async def fetch_radios(valkey_client: valkey.Valkey) -> list[model.Schedule]:
    """Fetch all radios and their schedules.

    Args:
        valkey_client: The Valkey client to use for caching.

    Returns:
        List of radios with their schedules.

    Raises:
        FetchingBrokenError: If no radios were fetched successfully.
    """
    fetchers = [
        rakkauden.RakkaudenFetcher(),
        turun.TurunFetcher(),
        diodi.DiodiFetcher(),
        wapina.WapinaFetcher(),
        norppa.NorppaFetcher(),
    ]
    radios = []
    async with aiohttp.ClientSession() as session:
        tasks = [fetcher(session, valkey_client) for fetcher in fetchers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for result in results:
            if isinstance(result, Exception):
                logger.exception("Error fetching a radio schedule", exc_info=result)
                continue
            radios.append(result)
    if not radios:
        raise FetchingBrokenError(
            "No radios were fetched successfully. See earlier logs for details."
        )
    return radios


async def now_playing(valkey_client: valkey.Valkey) -> list[model.NowPlaying]:
    """Get the current and next program for each radio.

    Args:
        valkey_client: The Valkey client to use for caching.

    Returns:
        List of radios with their current and next programs.

    Raises:
        FetchingBrokenError: If no radios were fetched successfully.
    """
    radios = await fetch_radios(valkey_client)
    now = datetime.now().astimezone()
    res = []

    for radio in radios:
        now_playing = None
        up_next = None
        for program in radio.schedule:
            if program.start <= now and now <= program.end:
                now_playing = program
            elif now < program.start and up_next is None:
                up_next = program
        res.append(
            model.NowPlaying(
                radio=radio.radio, now_playing=now_playing, up_next=up_next
            )
        )

    return res
