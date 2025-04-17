import aiohttp
import asyncio

from wappregator import model
from wappregator.radios import diodi, norppa, rakkauden, turun, wapina
from datetime import datetime


async def fetch_radios() -> list[model.Schedule]:
    """Fetch all radios and their schedules.

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
        radios = await asyncio.gather(*(fetcher(session) for fetcher in fetchers))
        return radios


async def now_playing() -> list[model.NowPlaying]:
    """Get the current and next program for each radio.

    Returns:
        List of radios with their current and next programs.
    """
    radios = await fetch_radios()
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
