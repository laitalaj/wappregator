import aiohttp
import asyncio
from datetime import datetime

import valkey.asyncio as valkey

from wappregator import model
from wappregator.radios import diodi, norppa, rakkauden, turun, wapina


async def fetch_radios(valkey_client: valkey.Valkey) -> list[model.Schedule]:
    """Fetch all radios and their schedules.

    Args:
        valkey_client: The Valkey client to use for caching.

    Returns:
        List of radios with their schedules.
    """
    fetchers = [
        diodi.DiodiFetcher(),
        norppa.NorppaFetcher(),
        rakkauden.RakkaudenFetcher(),
        turun.TurunFetcher(),
        wapina.WapinaFetcher(),
    ]
    async with aiohttp.ClientSession() as session:
        radios = await asyncio.gather(
            *(fetcher(session, valkey_client) for fetcher in fetchers)
        )
        return radios


async def now_playing(valkey_client: valkey.Valkey) -> list[model.NowPlaying]:
    """Get the current and next program for each radio.

    Args:
        valkey_client: The Valkey client to use for caching.

    Returns:
        List of radios with their current and next programs.
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
