import aiohttp
import asyncio
import logging

import valkey.asyncio as valkey
from wapprecommon import model, keys

from wappregator.radios import (
    diodi,
    jkl,
    norppa,
    rakkauden,
    ratto,
    sateily,
    turun,
    wapina,
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


async def _now_playing_for_radio(
    valkey_client: valkey.Valkey, radio_id: str
) -> model.Song | None:
    res = await valkey_client.get(keys.get_nowplaying_key(radio_id))
    if res:
        return model.Song.model_validate_json(res)
    return None


async def now_playing(valkey_client: valkey.Valkey) -> dict[str, model.Song | None]:
    """Get the currently playing song for all relevant radios.

    Args:
        valkey_client: The Valkey client used for caching.

    Returns:
        Dictionary; keys are radio IDs, values are their currently playing songs.
    """
    res = {}
    relevant_ids = [fetcher.id for fetcher in FETCHERS if fetcher.radio.has_now_playing]

    tasks = [_now_playing_for_radio(valkey_client, id) for id in relevant_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for id, result in zip(relevant_ids, results):
        if isinstance(result, BaseException):
            logger.exception("Error fetching a radio now playing", exc_info=result)
            continue
        res[id] = result

    if not res:
        raise FetchingBrokenError(
            "No radios were fetched successfully. See earlier logs for details."
        )
    return res
