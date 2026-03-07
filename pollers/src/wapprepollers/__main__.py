import asyncio
import logging

import valkey.asyncio as valkey
from wapprecommon import constants, radios

from wapprepollers.housekeeping import cleanup_dead_backends
from wapprepollers.heartbeat import heartbeat, ready
from wapprepollers.pollers import diodi, rakkauden, turun
from wapprepollers.streams import StreamChecker

NOWPLAYING_POLLERS = [
    rakkauden.RakkaudenPoller(),
    diodi.DiodiPoller(),
    turun.TurunPoller(),
    # Gives 403 as of 2026-02-06. Looks like there's nyt-soi.json,
    # but that's an empty object at the moment. Fix when we're closer to Wappu!
    # ratto.RattoPoller(),
]

STREAMSTATUS_POLLERS = [
    StreamChecker(radio) for radio in radios.ALL_RADIOS if radio.stream_check_enabled
]

if constants.INCLUDE_DEV_STATIONS:
    from wapprecommon import dev_radios

    from wapprepollers.pollers.somafm import get_somafm_pollers

    NOWPLAYING_POLLERS.extend(get_somafm_pollers())
    STREAMSTATUS_POLLERS.extend(
        StreamChecker(radio)
        for radio in dev_radios.ALL_DEV_RADIOS
        if radio.stream_check_enabled
    )

logger = logging.getLogger("wapprepollers")


async def main() -> None:
    """Run the pollers."""
    valkey_pool = valkey.ConnectionPool.from_url(constants.VALKEY_URL)
    async with asyncio.TaskGroup() as tg:
        tasks = [poller.loop_wrapper(valkey_pool) for poller in NOWPLAYING_POLLERS]
        tasks += [poller.loop_wrapper(valkey_pool) for poller in STREAMSTATUS_POLLERS]
        tasks += [cleanup_dead_backends(valkey_pool), heartbeat(), ready(valkey_pool)]
        for task in tasks:
            tg.create_task(task)
        logger.info("wapprepollers are go")


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    logging.getLogger("wapprepollers").setLevel(logging.INFO)
    asyncio.run(main())
