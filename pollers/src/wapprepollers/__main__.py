import asyncio
import logging

import valkey.asyncio as valkey
from wapprecommon import constants

from wapprepollers.heartbeat import heartbeat, ready
from wapprepollers.pollers import diodi, rakkauden, turun

POLLERS = [
    rakkauden.RakkaudenPoller(),
    diodi.DiodiPoller(),
    turun.TurunPoller(),
    # Gives 403 as of 2026-02-06. Looks like there's nyt-soi.json,
    # but that's an empty object at the moment. Fix when we're closer to Wappu!
    # ratto.RattoPoller(),
]

logger = logging.getLogger("wapprepollers")


async def main() -> None:
    """Run the pollers."""
    valkey_pool = valkey.ConnectionPool.from_url(constants.VALKEY_URL)
    tasks = [poller.loop_wrapper(valkey_pool) for poller in POLLERS]
    tasks += [heartbeat(), ready(valkey_pool)]
    logger.info("wapprepollers are go")
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    logging.getLogger("wapprepollers").setLevel(logging.INFO)
    asyncio.run(main())
