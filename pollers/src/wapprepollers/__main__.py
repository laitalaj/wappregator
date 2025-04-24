import asyncio
import logging

import valkey.asyncio as valkey
from wapprecommon import constants

from wapprepollers.pollers import diodi, rakkauden, ratto, turun

POLLERS = [
    rakkauden.RakkaudenPoller(),
    diodi.DiodiPoller(),
    turun.TurunPoller(),
    ratto.RattoPoller(),
]

logger = logging.getLogger("wapprepollers")


async def main() -> None:
    """Run the pollers."""
    valkey_pool = valkey.ConnectionPool.from_url(constants.VALKEY_URL)
    tasks = [poller.loop_wrapper(valkey_pool) for poller in POLLERS]
    logger.info("wapprepollers are go")
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    logging.getLogger("wapprepollers").setLevel(logging.INFO)
    asyncio.run(main())
