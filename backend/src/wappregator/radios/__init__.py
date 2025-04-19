import aiohttp
import asyncio
import logging

import valkey.asyncio as valkey

from wappregator import model
from wappregator.radios import diodi, norppa, rakkauden, turun, wapina

FETCHERS = [
    rakkauden.RakkaudenFetcher(),
    turun.TurunFetcher(),
    diodi.DiodiFetcher(),
    wapina.WapinaFetcher(),
    norppa.NorppaFetcher(),
]

logger = logging.getLogger(__name__)


class FetchingBrokenError(Exception):
    """Exception for errors that are due to radio fetching being broken on our end."""

    pass


def radios() -> list[model.Radio]:
    """Get the list of available radios.

    Returns:
        List of radios.
    """
    return [fetcher.radio for fetcher in FETCHERS]


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
