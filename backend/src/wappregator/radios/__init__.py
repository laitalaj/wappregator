import aiohttp
import asyncio
import logging

import valkey.asyncio as valkey

from wappregator import model
from wappregator.radios import (
    diodi, jkl, norppa, rakkauden, ratto, sateily, turun, wapina
)

FETCHERS = [
    rakkauden.RakkaudenFetcher(),
    turun.TurunFetcher(),
    diodi.DiodiFetcher(),
    norppa.NorppaFetcher(),
    wapina.WapinaFetcher(),
    ratto.RattoFetcher(),
    sateily.SateilyFetcher(),
    jkl.JklFetcher(),
]

POLLERS = [
    rakkauden.RakkaudenPoller(),
    diodi.DiodiPoller(),
    turun.TurunPoller(),
]

logger = logging.getLogger(__name__)


class FetchingBrokenError(Exception):
    """Exception for errors that are due to radio fetching being broken on our end."""

    pass


def radios() -> dict[str, model.Radio]:
    """Get the available radios.

    Returns:
        A dictionary from radio IDs to Radio objects.
    """
    return {fetcher.id: fetcher.radio for fetcher in FETCHERS}


async def schedule(valkey_client: valkey.Valkey) -> dict[str, list[model.Program]]:
    """Fetch schedules for all radios.

    Args:
        valkey_client: The Valkey client to use for caching.

    Returns:
        Dictionary; keys are radio IDs, values are their schedules.

    Raises:
        FetchingBrokenError: If no schedules were fetched successfully.
    """
    res = {}
    async with aiohttp.ClientSession() as session:
        keys = [fetcher.id for fetcher in FETCHERS]
        tasks = [fetcher(session, valkey_client) for fetcher in FETCHERS]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for key, result in zip(keys, results):
            if isinstance(result, BaseException):
                logger.exception("Error fetching a radio schedule", exc_info=result)
                continue
            res[key] = result

    if not res:
        raise FetchingBrokenError(
            "No radios were fetched successfully. See earlier logs for details."
        )

    return res


async def poll_loop(valkey_pool: valkey.ConnectionPool) -> asyncio.Future:
    """Poll radios for updates in an infinite loop.

    Args:
        valkey_pool: The Valkey connection pool to use for caching.
    """
    tasks = [poller.loop_wrapper(valkey_pool) for poller in POLLERS]
    return asyncio.gather(*tasks)


async def now_playing(valkey_client: valkey.Valkey) -> dict[str, model.Song | None]:
    """Get the currently playing song for all relevant radios.

    Args:
        valkey_client: The Valkey client used for caching.

    Returns:
        Dictionary; keys are radio IDs, values are their currently playing songs.
    """
    res = {}
    tasks = [poller.now_playing(valkey_client) for poller in POLLERS]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for poller, result in zip(POLLERS, results):
        if isinstance(result, BaseException):
            logger.exception("Error fetching a radio now playing", exc_info=result)
            continue
        res[poller.id] = result
    if not res:
        raise FetchingBrokenError(
            "No radios were fetched successfully. See earlier logs for details."
        )
    return res
